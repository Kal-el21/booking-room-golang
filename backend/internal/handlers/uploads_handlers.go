package handlers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/Kal-el21/booking-room-golang/backend/internal/services"
	"github.com/Kal-el21/booking-room-golang/backend/internal/utils"

	"github.com/gin-gonic/gin"
)

const (
	MaxUploadSize = 5 << 20 // 5 MB
	UserUploadDir = "./internal/uploads/users"
	RoomUploadDir = "./internal/uploads/rooms"
)

var allowedMimeTypes = map[string]string{
	"image/jpeg": ".jpg",
	"image/jpg":  ".jpg",
	"image/png":  ".png",
	"image/webp": ".webp",
}

// UploadHandler handles file uploads (room images only).
// User avatar upload is handled directly in UserHandler.UpdateCurrentUser.
type UploadHandler struct {
	roomService *services.RoomService
}

func NewUploadHandler(roomService *services.RoomService) *UploadHandler {
	return &UploadHandler{roomService: roomService}
}

// ── Shared helpers (also used by user_handler.go) ────────────────────────────

// sanitizeFilename removes characters that are unsafe for filenames.
func sanitizeFilename(s string) string {
	s = strings.ReplaceAll(s, "@", "_at_")
	s = strings.ReplaceAll(s, " ", "_")
	s = strings.ReplaceAll(s, ".", "_")
	re := regexp.MustCompile(`[^a-zA-Z0-9_\-]`)
	s = re.ReplaceAllString(s, "")
	re2 := regexp.MustCompile(`_+`)
	s = re2.ReplaceAllString(s, "_")
	return strings.Trim(s, "_")
}

// buildUserFilename builds: {name}_{email}_{division}_{timestamp}.{ext}
func buildUserFilename(name, email, division, ext string) string {
	parts := []string{sanitizeFilename(name), sanitizeFilename(email)}
	if division != "" {
		parts = append(parts, sanitizeFilename(division))
	}
	return fmt.Sprintf("%s_%d%s", strings.Join(parts, "_"), time.Now().Unix(), ext)
}

// buildRoomFilename builds: {room_name}_{capacity}_{location}_{timestamp}.{ext}
func buildRoomFilename(roomName string, capacity int, location, ext string) string {
	parts := []string{
		sanitizeFilename(roomName),
		sanitizeFilename(fmt.Sprintf("%d", capacity)),
		sanitizeFilename(location),
	}
	return fmt.Sprintf("%s_%d%s", strings.Join(parts, "_"), time.Now().Unix(), ext)
}

// detectMimeType reads the first 512 bytes to detect MIME type, then resets the reader.
func detectMimeType(file io.ReadSeeker) (string, error) {
	buf := make([]byte, 512)
	n, err := file.Read(buf)
	if err != nil && err != io.EOF {
		return "", err
	}
	if _, err := file.Seek(0, io.SeekStart); err != nil {
		return "", err
	}
	return http.DetectContentType(buf[:n]), nil
}

// ensureDir creates the directory path if it does not already exist.
func ensureDir(dir string) error {
	return os.MkdirAll(dir, 0755)
}

// ── Room Image Upload ─────────────────────────────────────────────────────────

// UploadRoomImage handles room image upload (room_admin only).
// @route POST /api/v1/rooms/:id/image
func (h *UploadHandler) UploadRoomImage(c *gin.Context) {
	id, err := utils.ParseIDParam(c, "id")
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid room ID", err.Error())
		return
	}

	room, err := h.roomService.GetRoom(id)
	if err != nil {
		utils.ErrorResponse(c, 404, "Room not found", err.Error())
		return
	}

	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, MaxUploadSize)

	file, header, err := c.Request.FormFile("image")
	if err != nil {
		utils.ErrorResponse(c, 400, "Failed to read file", "Please provide an image with field name 'image'")
		return
	}
	defer file.Close()

	if header.Size > MaxUploadSize {
		utils.ErrorResponse(c, 400, "File too large", "Maximum file size is 5MB")
		return
	}

	mimeType, err := detectMimeType(file)
	if err != nil {
		utils.ErrorResponse(c, 400, "Failed to detect file type", err.Error())
		return
	}
	ext, ok := allowedMimeTypes[mimeType]
	if !ok {
		utils.ErrorResponse(c, 400, "Invalid file type", "Only JPG, PNG, and WebP images are allowed")
		return
	}

	filename := buildRoomFilename(room.RoomName, room.Capacity, room.Location, ext)

	if err := ensureDir(RoomUploadDir); err != nil {
		utils.ErrorResponse(c, 500, "Failed to create upload directory", err.Error())
		return
	}

	// Delete old image file if one exists
	if room.ImageURL != nil && *room.ImageURL != "" {
		_ = os.Remove("." + *room.ImageURL)
	}

	destPath := filepath.Join(RoomUploadDir, filename)
	destFile, err := os.Create(destPath)
	if err != nil {
		utils.ErrorResponse(c, 500, "Failed to save file", err.Error())
		return
	}
	defer destFile.Close()

	if _, err := io.Copy(destFile, file); err != nil {
		utils.ErrorResponse(c, 500, "Failed to write file", err.Error())
		return
	}

	imageURL := fmt.Sprintf("/uploads/rooms/%s", filename)

	updatedRoom, err := h.roomService.UpdateRoomImage(id, imageURL)
	if err != nil {
		_ = os.Remove(destPath)
		utils.ErrorResponse(c, 500, "Failed to update room image", err.Error())
		return
	}

	utils.SuccessResponse(c, 200, "Room image uploaded successfully", gin.H{
		"image_url": imageURL,
		"room":      updatedRoom.ToResponse(),
	})
}

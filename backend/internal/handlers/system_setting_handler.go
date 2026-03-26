package handlers

import (
	"github.com/Kal-el21/booking-room-golang/backend/internal/services"
	"github.com/Kal-el21/booking-room-golang/backend/internal/utils"
	"github.com/gin-gonic/gin"
)

type SystemSettingHandler struct {
	settingService *services.SystemSettingService
}

func NewSystemSettingHandler(settingService *services.SystemSettingService) *SystemSettingHandler {
	return &SystemSettingHandler{settingService: settingService}
}

// GetSettings returns all system settings.
// Only room_admin can call this (enforced at the route level).
//
// @route GET /api/v1/admin/settings
func (h *SystemSettingHandler) GetSettings(c *gin.Context) {
	resp, err := h.settingService.GetAll()
	if err != nil {
		utils.ErrorResponse(c, 500, "Gagal mengambil pengaturan sistem", err.Error())
		return
	}
	utils.SuccessResponse(c, 200, "Pengaturan sistem berhasil diambil", resp)
}

// UpdateSettings accepts a partial update body and saves changed keys.
// Only room_admin can call this (enforced at the route level).
//
// @route PUT /api/v1/admin/settings
func (h *SystemSettingHandler) UpdateSettings(c *gin.Context) {
	var input struct {
		EmailVerificationEnabled *bool `json:"email_verification_enabled"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	if input.EmailVerificationEnabled != nil {
		if err := h.settingService.UpdateEmailVerification(*input.EmailVerificationEnabled); err != nil {
			utils.ErrorResponse(c, 500, "Gagal memperbarui pengaturan verifikasi email", err.Error())
			return
		}
	}

	// Return the updated full settings so the frontend can sync state
	resp, err := h.settingService.GetAll()
	if err != nil {
		utils.ErrorResponse(c, 500, "Gagal mengambil pengaturan terbaru", err.Error())
		return
	}

	utils.SuccessResponse(c, 200, "Pengaturan sistem berhasil diperbarui", resp)
}

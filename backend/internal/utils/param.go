package utils

import (
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

// ParseIDParam safely parses ID parameter from URL
func ParseIDParam(c *gin.Context, paramName string) (uint, error) {
	idStr := strings.TrimSpace(c.Param(paramName))
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		return 0, err
	}
	return uint(id), nil
}

// ParseQueryUint safely parses uint query parameter
func ParseQueryUint(c *gin.Context, key string, defaultValue uint) uint {
	valStr := strings.TrimSpace(c.Query(key))
	if valStr == "" {
		return defaultValue
	}

	val, err := strconv.ParseUint(valStr, 10, 32)
	if err != nil {
		return defaultValue
	}
	return uint(val)
}

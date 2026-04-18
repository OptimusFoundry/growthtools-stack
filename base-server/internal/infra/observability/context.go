package observability

import (
	"context"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

// Field represents a key-value pair for observability.
type Field struct {
	Key   string
	Value interface{}
}

// MetricField represents a key-value pair for logging metrics.
type MetricField struct {
	Key   string
	Value interface{}
}

type ObservabilityContextKey string

const observabilityKey ObservabilityContextKey = "observability_fields"

// WithFields adds a set of observability fields to the context.
func WithFields(ctx context.Context, fields ...Field) context.Context {
	existingFields := getObservabilityFields(ctx)
	existingFields = append(existingFields, fields...)
	return context.WithValue(ctx, observabilityKey, existingFields)
}

// getObservabilityFields retrieves observability fields from context.
func getObservabilityFields(ctx context.Context) []Field {
	if fields, ok := ctx.Value(observabilityKey).([]Field); ok {
		return fields
	}
	return nil
}

// mergeFields combines context fields and metric fields, avoiding duplicates.
func mergeFields(ctx context.Context, fields []MetricField) []zapcore.Field {
	fieldMap := make(map[string]zapcore.Field)

	// Add context-based fields to the map (ensures uniqueness).
	if ctxFields, ok := ctx.Value("observability_fields").([]zapcore.Field); ok {
		for _, field := range ctxFields {
			fieldMap[field.Key] = field
		}
	}

	// Add additional metric fields to the map.
	for _, field := range fields {
		fieldMap[field.Key] = zap.Any(field.Key, field.Value)
	}

	// Convert map to a slice of zapcore.Field.
	mergedFields := make([]zapcore.Field, 0, len(fieldMap))
	for _, field := range fieldMap {
		mergedFields = append(mergedFields, field)
	}

	return mergedFields
}

// GetRealClientIP extracts the real client IP from CloudFront headers.
// CloudFront-Viewer-Address contains the client IP in "IP:port" format.
// Falls back to c.ClientIP() if the header is not present.
func GetRealClientIP(c *gin.Context) string {
	if viewerAddr := c.GetHeader("CloudFront-Viewer-Address"); viewerAddr != "" {
		// Extract IP from "IP:port" format
		if colonIdx := strings.LastIndex(viewerAddr, ":"); colonIdx > 0 {
			return viewerAddr[:colonIdx]
		}
		return viewerAddr
	}
	return c.ClientIP()
}

// GetRealUserAgent extracts the user agent.
// CloudFront forwards the original User-Agent header, so we use the standard method.
func GetRealUserAgent(c *gin.Context) string {
	return c.Request.UserAgent()
}

// CloudFrontViewerInfo contains all CloudFront viewer headers
type CloudFrontViewerInfo struct {
	// Geographic data
	Country      *string
	Region       *string
	RegionCode   *string
	City         *string
	PostalCode   *string
	UserTimezone *string
	Latitude     *float64
	Longitude    *float64
	MetroCode    *string

	// Device detection (enum values)
	DeviceType *string // desktop, mobile, tablet, smarttv, unknown
	DeviceOS   *string // android, ios, other
}

// strPtrIfNotEmpty returns a pointer to the string if non-empty, otherwise nil
func strPtrIfNotEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// GetCloudFrontViewerInfo extracts all CloudFront viewer headers from the request.
func GetCloudFrontViewerInfo(c *gin.Context) CloudFrontViewerInfo {
	info := CloudFrontViewerInfo{
		// Geographic data
		Country:      strPtrIfNotEmpty(c.GetHeader("CloudFront-Viewer-Country-Name")),
		Region:       strPtrIfNotEmpty(c.GetHeader("CloudFront-Viewer-Country-Region-Name")),
		RegionCode:   strPtrIfNotEmpty(c.GetHeader("CloudFront-Viewer-Country-Region")),
		City:         strPtrIfNotEmpty(c.GetHeader("CloudFront-Viewer-City")),
		PostalCode:   strPtrIfNotEmpty(c.GetHeader("CloudFront-Viewer-Postal-Code")),
		UserTimezone: strPtrIfNotEmpty(c.GetHeader("CloudFront-Viewer-Time-Zone")),
		MetroCode:    strPtrIfNotEmpty(c.GetHeader("CloudFront-Viewer-Metro-Code")),
	}

	// Parse latitude
	if lat := c.GetHeader("CloudFront-Viewer-Latitude"); lat != "" {
		if parsed, err := strconv.ParseFloat(lat, 64); err == nil {
			info.Latitude = &parsed
		}
	}

	// Parse longitude
	if lon := c.GetHeader("CloudFront-Viewer-Longitude"); lon != "" {
		if parsed, err := strconv.ParseFloat(lon, 64); err == nil {
			info.Longitude = &parsed
		}
	}

	// Device type
	deviceType := GetDeviceType(c)
	info.DeviceType = &deviceType

	// Device OS
	deviceOS := GetDeviceOS(c)
	info.DeviceOS = &deviceOS

	return info
}

// GetDeviceType determines the device type from CloudFront headers and User-Agent parsing.
// Uses CloudFront-Is-Mobile-Viewer header when available, falls back to User-Agent parsing.
// Returns "desktop", "mobile", "tablet", "smarttv", or "unknown".
func GetDeviceType(c *gin.Context) string {
	// CloudFront mobile header is still available
	if c.GetHeader("CloudFront-Is-Mobile-Viewer") == "true" {
		return "mobile"
	}

	// Parse User-Agent for tablet, smarttv, and desktop detection
	ua := strings.ToLower(c.Request.UserAgent())

	// Check for tablets (must check before mobile patterns since tablets often contain "mobile")
	if strings.Contains(ua, "ipad") ||
		(strings.Contains(ua, "android") && !strings.Contains(ua, "mobile")) ||
		strings.Contains(ua, "tablet") {
		return "tablet"
	}

	// Check for smart TVs
	if strings.Contains(ua, "smart-tv") ||
		strings.Contains(ua, "smarttv") ||
		strings.Contains(ua, "googletv") ||
		strings.Contains(ua, "appletv") ||
		strings.Contains(ua, "roku") ||
		strings.Contains(ua, "webos") ||
		strings.Contains(ua, "tizen") {
		return "smarttv"
	}

	// Check for mobile (fallback if CloudFront header wasn't present)
	if strings.Contains(ua, "mobile") ||
		strings.Contains(ua, "iphone") ||
		strings.Contains(ua, "ipod") ||
		(strings.Contains(ua, "android") && strings.Contains(ua, "mobile")) {
		return "mobile"
	}

	// If we have a valid User-Agent, assume desktop
	if ua != "" {
		return "desktop"
	}

	return "unknown"
}

// GetDeviceOS determines the device OS from User-Agent parsing.
// Returns "android", "ios", or "other".
func GetDeviceOS(c *gin.Context) string {
	ua := strings.ToLower(c.Request.UserAgent())

	if strings.Contains(ua, "android") {
		return "android"
	}
	if strings.Contains(ua, "iphone") ||
		strings.Contains(ua, "ipad") ||
		strings.Contains(ua, "ipod") ||
		strings.Contains(ua, "ios") {
		return "ios"
	}
	return "other"
}

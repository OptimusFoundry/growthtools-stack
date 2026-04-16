package email

import (
	"base-server/internal/infra/clients/mail"
	"base-server/internal/infra/observability"
	"context"
	"fmt"
)

// EmailService handles sending emails
type EmailService struct {
	mailClient    *mail.ResendClient
	logger        *observability.Logger
	defaultSender string
}

// New creates a new EmailService
func New(mailClient *mail.ResendClient, defaultSender string, logger *observability.Logger) *EmailService {
	return &EmailService{
		mailClient:    mailClient,
		defaultSender: defaultSender,
		logger:        logger,
	}
}

// SendEmail sends an email using the configured mail client
func (s *EmailService) SendEmail(ctx context.Context, to, subject, htmlContent string) error {
	_, err := s.mailClient.SendEmail(ctx, s.defaultSender, to, subject, htmlContent)
	if err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}
	return nil
}

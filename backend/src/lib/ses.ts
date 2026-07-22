import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { logger } from "./logger.js";

/**
 * Shared SES client instance.
 * Uses AWS_REGION from environment. Credentials are resolved automatically
 * from environment variables, IAM roles, or AWS config files.
 *
 * When LOCAL=true, point at LocalStack instead of real SES (custom endpoint +
 * dummy static credentials). The sender is verified by scripts/localstack-init.sh.
 */
const isLocal = process.env.LOCAL === "true";

const ses = new SESClient({
  region: process.env.AWS_REGION || "us-east-1",
  ...(isLocal && {
    endpoint: process.env.SES_ENDPOINT || "http://localhost:4566",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "test",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "test",
    },
  }),
});

type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
};

/**
 * Sends an email via AWS SES.
 *
 * @description If SES_FROM_EMAIL is not configured, logs a warning and returns
 * without sending. Throws on SES errors so callers can handle failure.
 * @param params - The email parameters (to, subject, html body)
 */
async function sendEmail({ to, subject, html }: SendEmailParams): Promise<void> {
  const from = process.env.SES_FROM_EMAIL;

  if (!from) {
    logger.warn("SES_FROM_EMAIL not configured — skipping email send");
    return;
  }

  const command = new SendEmailCommand({
    Source: from,
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: subject },
      Body: { Html: { Data: html } },
    },
  });

  await ses.send(command);
}

/**
 * Sends an invitation email with an activation link.
 *
 * @description Builds the activation URL from FRONTEND_URL and sends a styled
 * invite email. In non-production, also emits the URL as a debug log.
 * @param email - The recipient's email address
 * @param token - The invitation activation token
 */
export async function sendInviteEmail(
  email: string,
  token: string
): Promise<void> {
  const baseUrl = process.env.FRONTEND_URL || "https://localhost:5173";
  const activationUrl = `${baseUrl}/signup/${token}`;

  if (process.env.NODE_ENV !== "production") {
    logger.debug({ email, activationUrl }, "dev-only invite link");
  }

  await sendEmail({
    to: email,
    subject: "You've been invited",
    html: `
      <h2>You've been invited</h2>
      <p>You've been invited to create an account. Click the link below to get started:</p>
      <p><a href="${activationUrl}">Accept Invitation</a></p>
      <p>This link expires in 24 hours.</p>
    `,
  });
  logger.info("invitation email sent");
}

/**
 * Sends a password reset email with the reset link.
 *
 * @description Uses the URL provided by better-auth which already contains
 * the reset token. In non-production, also emits the URL as a debug log.
 * @param email - The recipient's email address
 * @param url - The full password reset URL from better-auth
 */
export async function sendPasswordResetEmail(
  email: string,
  url: string
): Promise<void> {
  if (process.env.NODE_ENV !== "production") {
    logger.debug({ email, url }, "dev-only reset link");
  }

  await sendEmail({
    to: email,
    subject: "Reset your password",
    html: `
      <h2>Reset your password</h2>
      <p>We received a request to reset your password. Click the link below to choose a new one:</p>
      <p><a href="${url}">Reset Password</a></p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
  });
}

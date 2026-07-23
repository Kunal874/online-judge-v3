function layout(title: string, bodyHtml: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>${title}</h2>
      ${bodyHtml}
      <p style="color: #888; font-size: 12px; margin-top: 32px;">
        If you didn't request this, you can safely ignore this email.
      </p>
    </div>
  `;
}

export function verifyEmailTemplate(link: string): string {
  return layout(
    "Verify your email",
    `<p>Welcome to Online Judge! Click below to verify your email address.</p>
     <p><a href="${link}">${link}</a></p>`,
  );
}

export function resetPasswordTemplate(link: string): string {
  return layout(
    "Reset your password",
    `<p>Click below to choose a new password. This link expires in 1 hour.</p>
     <p><a href="${link}">${link}</a></p>`,
  );
}

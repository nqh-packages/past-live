/**
 * @what - Shared Clerk appearance theme for Past, Live (War Room Dispatch)
 * @why - All Clerk components (SignIn, SignUp, UserButton) must match the dark
 *        retro-terminal aesthetic. Single source of truth — change once, applies everywhere.
 *
 * Design tokens mirror global.css @theme:
 *   background: #0f0f0f | surface: #161616 | foreground: #e8e0d8
 *   accent: #ff3c28 | muted: rgba(232,224,216,0.3) | border: rgba(255,255,255,0.06)
 *   fonts: Bebas Neue (display) · Space Mono (mono/body)
 *   radius: 0px (sharp — no rounding anywhere)
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const clerkAppearance: Record<string, any> = {
  variables: {
    colorPrimary: "#ff3c28",
    colorBackground: "#0f0f0f",
    colorText: "#e8e0d8",
    colorTextSecondary: "rgba(232, 224, 216, 0.5)",
    colorTextOnPrimaryBackground: "#0f0f0f",
    colorInputBackground: "#161616",
    colorInputText: "#e8e0d8",
    colorDanger: "#ff3c28",
    colorSuccess: "#4caf77",
    borderRadius: "0px",
    fontFamily: '"Space Mono", monospace',
    fontFamilyButtons: '"Bebas Neue", sans-serif',
    fontSize: "14px",
    spacingUnit: "4px",
  },
  elements: {
    // Card / modal container
    card: {
      backgroundColor: "#0f0f0f",
      border: "1px solid rgba(255, 255, 255, 0.06)",
      boxShadow: "none",
      borderRadius: "0px",
    },
    cardBox: {
      boxShadow: "none",
    },

    // Header
    headerTitle: {
      fontFamily: '"Bebas Neue", sans-serif',
      color: "#e8e0d8",
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      fontSize: "24px",
    },
    headerSubtitle: {
      fontFamily: '"Space Mono", monospace',
      color: "rgba(232, 224, 216, 0.5)",
      fontSize: "11px",
    },

    // Primary action button
    formButtonPrimary: {
      backgroundColor: "#ff3c28",
      color: "#0f0f0f",
      borderRadius: "0px",
      fontFamily: '"Bebas Neue", sans-serif',
      textTransform: "uppercase",
      letterSpacing: "0.1em",
      fontSize: "16px",
      boxShadow: "none",
      "&:hover": {
        backgroundColor: "#e03520",
      },
      "&:focus-visible": {
        outline: "2px solid #ff3c28",
        outlineOffset: "2px",
      },
    },

    // Secondary buttons
    formButtonSecondary: {
      backgroundColor: "#161616",
      color: "#e8e0d8",
      borderRadius: "0px",
      border: "1px solid rgba(255, 255, 255, 0.06)",
      fontFamily: '"Space Mono", monospace',
      boxShadow: "none",
    },

    // Text inputs
    formFieldInput: {
      backgroundColor: "#161616",
      borderColor: "rgba(255, 255, 255, 0.06)",
      color: "#e8e0d8",
      borderRadius: "0px",
      fontFamily: '"Space Mono", monospace',
      fontSize: "13px",
      "&:focus": {
        borderColor: "#ff3c28",
        outline: "none",
        boxShadow: "none",
      },
    },
    formFieldLabel: {
      fontFamily: '"Space Mono", monospace',
      color: "rgba(232, 224, 216, 0.5)",
      fontSize: "10px",
      textTransform: "uppercase",
      letterSpacing: "0.1em",
    },
    formFieldErrorText: {
      fontFamily: '"Space Mono", monospace',
      color: "#ff3c28",
      fontSize: "11px",
    },
    formFieldSuccessText: {
      fontFamily: '"Space Mono", monospace',
      fontSize: "11px",
    },

    // Social auth buttons (Google, GitHub, etc.)
    socialButtonsBlockButton: {
      backgroundColor: "#161616",
      border: "1px solid rgba(255, 255, 255, 0.06)",
      borderRadius: "0px",
      color: "#e8e0d8",
      fontFamily: '"Space Mono", monospace',
      fontSize: "12px",
      boxShadow: "none",
      "&:hover": {
        backgroundColor: "#1e1e1e",
      },
    },
    socialButtonsBlockButtonText: {
      fontFamily: '"Space Mono", monospace',
      color: "#e8e0d8",
    },

    // Divider
    dividerLine: {
      backgroundColor: "rgba(255, 255, 255, 0.06)",
    },
    dividerText: {
      color: "rgba(232, 224, 216, 0.3)",
      fontFamily: '"Space Mono", monospace',
      fontSize: "10px",
      textTransform: "uppercase",
      letterSpacing: "0.1em",
    },

    // Footer / links
    footerActionLink: {
      color: "#ff3c28",
      fontFamily: '"Space Mono", monospace',
      fontSize: "12px",
      "&:hover": {
        color: "#e03520",
      },
    },
    footerActionText: {
      color: "rgba(232, 224, 216, 0.3)",
      fontFamily: '"Space Mono", monospace',
      fontSize: "12px",
    },
    footer: {
      backgroundColor: "#0f0f0f",
      borderTop: "1px solid rgba(255, 255, 255, 0.06)",
    },

    // Internal nav (sign in ↔ sign up)
    identityPreviewText: {
      color: "#e8e0d8",
      fontFamily: '"Space Mono", monospace',
    },
    identityPreviewEditButton: {
      color: "#ff3c28",
    },

    // Alert / error banner
    alert: {
      backgroundColor: "rgba(255, 60, 40, 0.08)",
      border: "1px solid rgba(255, 60, 40, 0.2)",
      borderRadius: "0px",
    },
    alertText: {
      color: "#e8e0d8",
      fontFamily: '"Space Mono", monospace',
      fontSize: "12px",
    },

    // OTP / verification code input
    otpCodeFieldInput: {
      backgroundColor: "#161616",
      borderColor: "rgba(255, 255, 255, 0.06)",
      color: "#e8e0d8",
      borderRadius: "0px",
      fontFamily: '"Space Mono", monospace',
    },

    // UserButton: avatar button
    userButtonAvatarBox: {
      width: "28px",
      height: "28px",
      borderRadius: "0px",
      border: "1px solid rgba(255, 255, 255, 0.06)",
    },
    userButtonTrigger: {
      borderRadius: "0px",
      "&:focus-visible": {
        outline: "2px solid #ff3c28",
        outlineOffset: "2px",
      },
    },

    // UserButton popover
    userButtonPopoverCard: {
      backgroundColor: "#0f0f0f",
      border: "1px solid rgba(255, 255, 255, 0.06)",
      borderRadius: "0px",
      boxShadow: "none",
    },
    userButtonPopoverActionButton: {
      borderRadius: "0px",
      color: "#e8e0d8",
      fontFamily: '"Space Mono", monospace',
      fontSize: "12px",
      "&:hover": {
        backgroundColor: "#161616",
      },
    },
    userButtonPopoverActionButtonText: {
      color: "#e8e0d8",
      fontFamily: '"Space Mono", monospace',
    },
    userButtonPopoverActionButtonIcon: {
      color: "rgba(232, 224, 216, 0.5)",
    },
    userButtonPopoverFooter: {
      display: "none",
    },

    // UserProfile (full profile page if used)
    profileSectionTitle: {
      fontFamily: '"Bebas Neue", sans-serif',
      color: "#e8e0d8",
      textTransform: "uppercase",
      letterSpacing: "0.05em",
    },
    profileSectionContent: {
      fontFamily: '"Space Mono", monospace',
    },
    navbarButton: {
      color: "rgba(232, 224, 216, 0.5)",
      fontFamily: '"Space Mono", monospace',
      fontSize: "12px",
      "&:hover": {
        color: "#e8e0d8",
      },
    },
    navbarButtonIcon: {
      color: "rgba(232, 224, 216, 0.5)",
    },
  },
};

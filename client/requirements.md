## Packages
framer-motion | For beautiful page transitions and futuristic UI interactions
lucide-react | Standardized iconography
clsx | Class conditional joining
tailwind-merge | Class merging for Tailwind

## Notes
- Tailwind Config - extend fontFamily:
  fontFamily: {
    display: ["var(--font-display)"],
    sans: ["var(--font-sans)"],
  }
- Uses Replit Auth endpoints (`/api/login`, `/api/logout`, `/api/auth/user`) for authentication.
- Assumes `useAuth` is available in `@/hooks/use-auth`.

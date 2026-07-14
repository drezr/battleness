export type AuthSessionState = {
  authenticated: boolean;
  developmentAuthEnabled: boolean;
  googleAuthEnabled: boolean;
  session: null | {
    id: string;
    expiresAt: string;
    player: {
      id: string;
      username: string;
      displayName: string;
    };
  };
};

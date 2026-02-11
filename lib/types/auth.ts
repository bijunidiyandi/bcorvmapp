// ===========================
// Request payload for login
// ===========================
export interface LoginRequest {
  username: string;
  password: string;
}

// ===========================
// Response returned from API after login
// ===========================
export interface LoginResponse {
  token: string;          // JWT token
  refreshToken?: string;  // Optional refresh token
  expiresIn?: number;     // Token expiry in seconds
  userName?: string;      // Optional user name
  email?: string;         // Optional email
  roles:[];
    // Added fields for local use
  expiresAt?: number;      // JWT expiry timestamp in milliseconds
  issuedAt?: number;       // JWT issued timestamp in milliseconds
}

// ===========================
// Decoded JWT token structure
// ===========================
export interface DecodedToken {
  sub?: string;           // Subject / User ID
  given_name?: string;    // User full name
  email?: string;         // Email
  exp?: number;           // Expiration timestamp (seconds)
  iat?: number;           // Issued at timestamp (seconds)
  [key: string]: any;     // For any additional claims
}

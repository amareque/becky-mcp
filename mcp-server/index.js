import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Create an MCP server
const server = new McpServer({
    name: "demo-server",
    version: "1.0.0"
});

// Auth state file path
const AUTH_FILE_PATH = path.join(os.homedir(), '.becky_mcp_auth.json');

// Store authentication state in memory (for this session)
let authState = null;

// Load authentication state from file on startup
async function loadAuthState() {
    try {
        const data = await fs.readFile(AUTH_FILE_PATH, 'utf8');
        const savedAuth = JSON.parse(data);

        // Check if token is still valid (if you have expiration)
        if (savedAuth.expiresAt && Date.now() > savedAuth.expiresAt) {
            console.log('Saved token expired, clearing auth state');
            await clearAuthState();
            return null;
        }

        authState = savedAuth;
        console.log('Loaded authentication state from file');
        return authState;
    } catch (error) {
        // File doesn't exist or is invalid, that's ok
        console.log('No saved authentication state found');
        return null;
    }
}

// Save authentication state to file
async function saveAuthState(auth) {
    try {
        await fs.writeFile(AUTH_FILE_PATH, JSON.stringify(auth, null, 2));
        console.log('Authentication state saved to file');
    } catch (error) {
        console.log('Failed to save authentication state:', error);
    }
}

// Clear authentication state
async function clearAuthState() {
    authState = null;
    try {
        await fs.unlink(AUTH_FILE_PATH);
        console.log('Authentication state cleared');
    } catch (error) {
        // File might not exist, that's ok
    }
}

// Load auth state on startup
await loadAuthState();

// Add an addition tool
server.registerTool("add",
    {
        title: "Addition Tool",
        description: "Add two numbers",
        inputSchema: { a: z.number(), b: z.number() }
    },
    async ({ a, b }) => ({
        content: [{ type: "text", text: String(a + b) }]
    })
);

// Login tool to authenticate and store user data
server.registerTool("login",
    {
        title: "Login to Becky",
        description: "Authenticate with Becky using email and password to get access token",
        inputSchema: { 
            email: z.string().email(),
            password: z.string()
        }
    },
    async ({ email, password }) => {
        try {
            // Make request to your API to login
            const apiUrl = process.env.API_SERVER_URL || 'http://localhost:3001';
            const response = await fetch(`${apiUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    password
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                return {
                    content: [{ 
                        type: "text", 
                        text: `Login failed: ${errorData.error || 'Invalid credentials'}` 
                    }]
                };
            }

            const loginData = await response.json();
            
            // Store authentication data in server memory
            authState = {
                userId: loginData.user.id,
                userEmail: loginData.user.email,
                userName: loginData.user.name,
                token: loginData.token,
                isAuthenticated: true,
                // Add expiration if your API provides it
                expiresAt: loginData.expiresAt || (Date.now() + (24 * 60 * 60 * 1000)) // 24 hours default
            };

            // Save to file for persistence
            await saveAuthState(authState);

            return {
                content: [{
                    type: "text",
                    text: `Login successful! Welcome back, ${loginData.user.name}. Your user ID is ${loginData.user.id}. Authentication state will persist across sessions.`
                }]
            };
        } catch (error) {
            console.log('Error during login:', error);
            return {
                content: [{
                    type: "text",
                    text: `Login error: ${error.message}`
                }]
            };
        }
    }
);

// Register tool for new users
server.registerTool("register",
    {
        title: "Register new user",
        description: "Create a new account with Becky using name, email, and password",
        inputSchema: { 
            name: z.string().min(1, "Name is required"),
            email: z.string().email("Valid email is required"),
            password: z.string().min(6, "Password must be at least 6 characters")
        }
    },
    async ({ name, email, password }) => {
        try {
            // Make request to your API to register
            const apiUrl = process.env.API_SERVER_URL || 'http://localhost:3001';
            const response = await fetch(`${apiUrl}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name,
                    email,
                    password
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                return {
                    content: [{ 
                        type: "text", 
                        text: `Registration failed: ${errorData.error || 'Registration failed'}` 
                    }]
                };
            }

            const registerData = await response.json();
            
            // Store authentication data in server memory (auto-login after registration)
            authState = {
                userId: registerData.user.id,
                userEmail: registerData.user.email,
                userName: registerData.user.name,
                token: registerData.token,
                isAuthenticated: true,
                // Add expiration if your API provides it
                expiresAt: registerData.expiresAt || (Date.now() + (24 * 60 * 60 * 1000)) // 24 hours default
            };

            // Save to file for persistence
            await saveAuthState(authState);

            return {
                content: [{
                    type: "text",
                    text: `Registration successful! Welcome to Becky, ${registerData.user.name}. Your account has been created with user ID ${registerData.user.id}. You are now logged in and can use other tools like create_account.`
                }]
            };
        } catch (error) {
            console.log('Error during registration:', error);
            return {
                content: [{
                    type: "text",
                    text: `Registration error: ${error.message}`
                }]
            };
        }
    }
);

// Add logout tool
server.registerTool("logout",
    {
        title: "Logout from Becky",
        description: "Clear authentication state and logout",
        inputSchema: {}
    },
    async () => {
        await clearAuthState();
        return {
            content: [{
                type: "text",
                text: "Successfully logged out. Authentication state cleared."
            }]
        };
    }
);

// Register tool to get current user info
server.registerTool("get_user_info",
    {
        title: "Get Current User Info",
        description: "Get information about the currently logged in user",
        inputSchema: {}
    },
    async (params) => {
        try {
            // Check if user is authenticated
            if (!authState || !authState.isAuthenticated) {
                return {
                    content: [{
                        type: "text",
                        text: "You are not logged in. Please use the login tool first."
                    }]
                };
            }

            // Check token expiration
            if (authState.expiresAt && Date.now() > authState.expiresAt) {
                await clearAuthState();
                return {
                    content: [{
                        type: "text",
                        text: "Your session has expired. Please login again."
                    }]
                };
            }

            // Make request to API to get current user info
            const apiUrl = process.env.API_SERVER_URL || 'http://localhost:3001';
            const response = await fetch(`${apiUrl}/users/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authState.token}`,
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                // Token might be invalid, clear state
                if (response.status === 401) {
                    await clearAuthState();
                    return {
                        content: [{
                            type: "text",
                            text: "Authentication failed. Please login again."
                        }]
                    };
                }

                return {
                    content: [{
                        type: "text",
                        text: "Failed to get user info. Please try again."
                    }]
                };
            }

            const userData = await response.json();

            return {
                content: [{
                    type: "text",
                    text: `Current user: ${userData.name} (${userData.email}) - User ID: ${userData.id}`
                }]
            };
        } catch (error) {
            console.log('Error getting user info:', error);
            return {
                content: [{
                    type: "text",
                    text: `Error getting user info: ${error.message}`
                }]
            };
        }
    }
);

server.registerTool("create_account",
    {
        title: "Create account tool",
        description: "Tool for creating an account on the finance app",
        inputSchema: {
            name: z.string(),
            bank: z.string().optional(),
            type: z.string().optional()
        }
    },
    async ({ name, bank, type }) => {
        try {
            // Check if user is authenticated
            if (!authState || !authState.isAuthenticated) {
                return {
                    content: [{
                        type: "text",
                        text: "You are not logged in. Please use the login tool first."
                    }]
                };
            }

            // Check token expiration
            if (authState.expiresAt && Date.now() > authState.expiresAt) {
                await clearAuthState();
                return {
                    content: [{
                        type: "text",
                        text: "Your session has expired. Please login again."
                    }]
                };
            }

            // Make request to your API to create account
            const apiUrl = process.env.API_SERVER_URL || 'http://localhost:3001';
            const response = await fetch(`${apiUrl}/accounts`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authState.token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: authState.userId,
                    name,
                    bank,
                    type
                })
            });

            if (!response.ok) {
                // Handle auth errors
                if (response.status === 401) {
                    await clearAuthState();
                    return {
                        content: [{
                            type: "text",
                            text: "Authentication failed. Please login again."
                        }]
                    };
                }

                const errorData = await response.json();
                return {
                    content: [{
                        type: "text",
                        text: `Failed to create account: ${errorData.error || response.statusText}`
                    }]
                };
            }

            const accountData = await response.json();
            return {
                content: [{
                    type: "text",
                    text: `Account created successfully! Account ID: ${accountData.id}, Name: ${accountData.name}`
                }]
            };
        } catch (error) {
            console.log('Error creating account:', error);
            return {
                content: [{
                    type: "text",
                    text: `Error creating account: ${error.message}`
                }]
            };
        }
    }
);

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
await server.connect(transport);
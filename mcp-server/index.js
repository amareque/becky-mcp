import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Create an MCP server
const server = new McpServer({
    name: "demo-server",
    version: "1.0.0"
});

// Store authentication state in memory (for this session)
let authState = null;

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
                isAuthenticated: true
            };

            // Set state in MCP server for Claude to access
            await server.setState({
                auth: authState
            });

            return {
                content: [{
                    type: "text",
                    text: `Login successful! Welcome back, ${loginData.user.name}. Your user ID is ${loginData.user.id}. You can now use other tools like create_account.`
                }]
            };
        } catch (error) {
            console.error('Error during login:', error);
            return {
                content: [{
                    type: "text",
                    text: `Login error: ${error.message}`
                }]
            };
        }
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
                return {
                    content: [{
                        type: "text",
                        text: "Failed to get user info. Please login again."
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
            console.error('Error getting user info:', error);
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
            console.error('Error creating account:', error);
            return {
                content: [{
                    type: "text",
                    text: `Error creating account: ${error.message}`
                }]
            };
        }
    }
);

/*
// Add a dynamic greeting resource
server.registerResource(
    "greeting",
    new ResourceTemplate("greeting://{name}", { list: undefined }),
    {
        title: "Greeting Resource",      // Display name for UI
        description: "Dynamic greeting generator"
    },
    async (uri, { name }) => ({
        contents: [{
            uri: uri.href,
            text: `Hello, ${name}!`
        }]
    })
);
*/

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
await server.connect(transport);
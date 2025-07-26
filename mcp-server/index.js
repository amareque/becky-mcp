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
            type: z.string().optional(),
            currency: z.string().default("UYU")
        }
    },
    async ({ name, bank, type, currency }) => {
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
                    type,
                    currency
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
                    text: `Account created successfully! Account ID: ${accountData.id}, Name: ${accountData.name}, Currency: ${accountData.currency}`
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

// Create movement tool for income/expense transactions
server.registerTool("create_movement",
    {
        title: "Create movement",
        description: "Create a new income or expense movement for an account. ⚠️ CRITICAL RULES: 1) NEVER guess amounts - always ask the user for exact amounts, 2) NEVER assume dates - ask for specific dates, 3) NEVER use vague descriptions - ask for detailed descriptions, 4) ALWAYS confirm all details with the user before creating, 5) If any information seems like a guess or placeholder, ask the user to provide the exact information.",
        inputSchema: {
            accountId: z.string().min(1, "Account ID is required - use get_accounts to see available accounts"),
            type: z.enum(["income", "expense"], {
                errorMap: () => ({ message: "Type must be explicitly set to either 'income' or 'expense' - ask the user which type this is" })
            }),
            concept: z.enum(["needs", "wants", "savings", "others"], {
                errorMap: () => ({ message: "Concept must be explicitly set to one of: needs, wants, savings, others - ask the user to categorize this expense" })
            }).optional(),
            amount: z.number()
                .positive("Amount must be a positive number")
                .refine(val => val !== 1 && val !== 10 && val !== 100 && val !== 1000, {
                    message: "This looks like a placeholder amount. Please ask the user for the exact amount."
                })
                .refine(val => !Number.isInteger(val) || val < 10000, {
                    message: "Please confirm this exact amount with the user - large round numbers often indicate guesses."
                }),
            description: z.string()
                .min(5, "Description must be at least 5 characters - ask for specific details")
                .max(500, "Description must be less than 500 characters")
                .refine(val => !['unknown', 'guess', 'estimate', 'approximately', 'around', 'about'].some(word => 
                    val.toLowerCase().includes(word)
                ), {
                    message: "Description seems vague or estimated. Please ask the user for specific details about this transaction."
                })
                .refine(val => val.trim().split(' ').length >= 2, {
                    message: "Please provide a more detailed description - ask the user for specifics about what this transaction was for."
                }),
            date: z.string()
                .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
                .refine(val => {
                    const date = new Date(val);
                    const today = new Date();
                    today.setHours(23, 59, 59, 999); // End of today
                    return date <= today;
                }, {
                    message: "Date cannot be in the future - ask the user for the actual date of this transaction"
                })
                .refine(val => {
                    const date = new Date(val);
                    const oneYearAgo = new Date();
                    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
                    return date >= oneYearAgo;
                }, {
                    message: "Date seems too old (more than 1 year ago) - please confirm this date with the user"
                }),
            category: z.string().optional(),
            // Add a confirmation flag to ensure user explicitly provided the data
            userConfirmed: z.boolean().default(false).refine(val => val === true, {
                message: "You must confirm with the user that all details are correct before creating the movement. Set userConfirmed to true only after explicit user confirmation."
            })
        }
    },
    async ({ accountId, type, concept, amount, description, date, category, userConfirmed }) => {
        try {
            // Authentication checks (same as before)
            if (!authState || !authState.isAuthenticated) {
                return {
                    content: [{
                        type: "text",
                        text: "You are not logged in. Please use the login tool first."
                    }]
                };
            }

            if (authState.expiresAt && Date.now() > authState.expiresAt) {
                await clearAuthState();
                return {
                    content: [{
                        type: "text",
                        text: "Your session has expired. Please login again."
                    }]
                };
            }

            // Additional runtime validation to catch common guessing patterns
            
            // Check for suspicious round numbers
            if (amount % 100 === 0 && amount >= 100) {
                return {
                    content: [{
                        type: "text",
                        text: "❌ SUSPICIOUS AMOUNT DETECTED\n\nThe amount appears to be a round number which might indicate a guess. Please confirm with the user that this is the exact amount."
                    }]
                };
            }

            // Check for common placeholder amounts
            const commonPlaceholders = [1, 5, 10, 20, 25, 50, 100, 200, 500, 1000];
            if (commonPlaceholders.includes(amount)) {
                return {
                    content: [{
                        type: "text",
                        text: "❌ PLACEHOLDER AMOUNT DETECTED\n\nThis looks like a placeholder or estimated amount. Please ask the user for the exact amount of this transaction."
                    }]
                };
            }

            // Check for suspicious description patterns
            const suspiciousWords = ['payment', 'transaction', 'expense', 'income', 'money', 'cost', 'price'];
            const descWords = description.toLowerCase().split(' ');
            if (descWords.length === 1 && suspiciousWords.includes(descWords[0])) {
                return {
                    content: [{
                        type: "text",
                        text: "❌ GENERIC DESCRIPTION DETECTED\n\nThe description is too generic. Please ask the user for specific details about what this transaction was for (e.g., 'grocery shopping at Walmart', 'salary from ABC Company')."
                    }]
                };
            }

            // Check if date is today (might indicate guessing)
            const today = new Date().toISOString().split('T')[0];
            if (date === today) {
                return {
                    content: [{
                        type: "text",
                        text: "⚠️ TODAY'S DATE DETECTED\n\nYou're using today's date. Please confirm with the user that this transaction actually occurred today, or ask them for the specific date."
                    }]
                };
            }

            // Validate concept requirement for expenses
            if (type === 'expense' && !concept) {
                return {
                    content: [{
                        type: "text",
                        text: "❌ CONCEPT REQUIRED FOR EXPENSES\n\nFor expenses, you must ask the user to categorize it as one of:\n- needs (essential expenses like food, rent, utilities)\n- wants (discretionary spending like entertainment, dining out)\n- savings (money saved or invested)\n- others (miscellaneous expenses)\n\nPlease ask: 'Is this expense for needs, wants, savings, or others?'"
                    }]
                };
            }

            // If all validations pass, create the movement
            const movementData = {
                type,
                amount,
                description,
                date,
                category
            };

            if (type === 'expense' && concept) {
                movementData.concept = concept;
            } else if (type === 'income' && concept) {
                movementData.concept = concept;
            }

            // Make API request
            const apiUrl = process.env.API_SERVER_URL || 'http://localhost:3001';
            const response = await fetch(`${apiUrl}/movements/account/${accountId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authState.token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(movementData)
            });

            if (!response.ok) {
                if (response.status === 401) {
                    await clearAuthState();
                    return {
                        content: [{
                            type: "text",
                            text: "Authentication failed. Please login again."
                        }]
                    };
                }

                if (response.status === 404) {
                    return {
                        content: [{
                            type: "text",
                            text: "❌ ACCOUNT NOT FOUND\n\nAccount ID not found. Please use the get_accounts tool to see your available accounts and their IDs."
                        }]
                    };
                }

                const errorData = await response.json();
                return {
                    content: [{
                        type: "text",
                        text: `Failed to create movement: ${errorData.error || response.statusText}`
                    }]
                };
            }

            const movementResponse = await response.json();
            
            const typeText = type === 'income' ? 'Income' : 'Expense';
            const amountText = `$${amount.toFixed(2)}`;
            
            let responseText = `✅ ${typeText} movement created successfully!\n\nDetails:\n- Movement ID: ${movementResponse.id}\n- Type: ${typeText}\n- Amount: ${amountText}\n- Description: ${description}\n- Date: ${date}`;
            
            if (concept) {
                responseText += `\n- Concept: ${concept}`;
            }
            
            if (category) {
                responseText += `\n- Category: ${category}`;
            }
            
            responseText += `\n- Account ID: ${accountId}`;

            return {
                content: [{
                    type: "text",
                    text: responseText
                }]
            };
        } catch (error) {
            console.log('Error creating movement:', error);
            return {
                content: [{
                    type: "text",
                    text: `Error creating movement: ${error.message}`
                }]
            };
        }
    }
);

// Confirm movement tool - requires explicit user confirmation
server.registerTool("confirm_movement",
    {
        title: "Confirm movement details",
        description: "Confirm movement details before creating. Use this when you need to verify information with the user before proceeding.",
        inputSchema: {
            accountId: z.string().min(1, "Account ID is required"),
            type: z.enum(["income", "expense"]),
            concept: z.enum(["needs", "wants", "savings", "others"]).optional(),
            amount: z.number().positive("Amount must be positive"),
            description: z.string().min(1, "Description is required"),
            date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format"),
            category: z.string().optional(),
            confirmed: z.boolean().default(false)
        }
    },
    async ({ accountId, type, concept, amount, description, date, category, confirmed }) => {
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

            // If not confirmed, show details and ask for confirmation
            if (!confirmed) {
                const typeText = type === 'income' ? 'Income' : 'Expense';
                const amountText = `$${amount.toFixed(2)}`;
                
                let confirmationText = `📋 MOVEMENT DETAILS - PLEASE CONFIRM\n\n`;
                confirmationText += `Type: ${typeText}\n`;
                confirmationText += `Amount: ${amountText}\n`;
                confirmationText += `Description: ${description}\n`;
                confirmationText += `Date: ${date}\n`;
                confirmationText += `Account ID: ${accountId}\n`;
                
                if (concept) {
                    confirmationText += `Concept: ${concept}\n`;
                }
                
                if (category) {
                    confirmationText += `Category: ${category}\n`;
                }
                
                confirmationText += `\n⚠️ Please confirm these details are correct by setting 'confirmed' to true.`;
                confirmationText += `\n\nIf any details are wrong, please correct them and try again.`;

                return {
                    content: [{
                        type: "text",
                        text: confirmationText
                    }]
                };
            }

            // If confirmed, proceed with creating the movement
            // Validate concept requirement for expenses
            if (type === 'expense' && !concept) {
                return {
                    content: [{
                        type: "text",
                        text: "❌ CONCEPT REQUIRED FOR EXPENSES\n\nFor expenses, you must specify a concept. Please ask the user to choose one of: needs, wants, savings, or others."
                    }]
                };
            }

            // Prepare movement data
            const movementData = {
                type,
                amount,
                description,
                date,
                category
            };

            // Only include concept for expenses
            if (type === 'expense' && concept) {
                movementData.concept = concept;
            } else if (type === 'income' && concept) {
                movementData.concept = concept;
            }

            // Make request to your API to create movement
            const apiUrl = process.env.API_SERVER_URL || 'http://localhost:3001';
            const response = await fetch(`${apiUrl}/movements/account/${accountId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authState.token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(movementData)
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

                // Handle not found errors
                if (response.status === 404) {
                    return {
                        content: [{
                            type: "text",
                            text: "❌ ACCOUNT NOT FOUND\n\nAccount ID not found. Please use the get_accounts tool to see your available accounts and their IDs."
                        }]
                    };
                }

                const errorData = await response.json();
                return {
                    content: [{
                        type: "text",
                        text: `Failed to create movement: ${errorData.error || response.statusText}`
                    }]
                };
            }

            const movementResponse = await response.json();
            
            // Format the response
            const typeText = type === 'income' ? 'Income' : 'Expense';
            const amountText = `$${amount.toFixed(2)}`;
            
            let responseText = `✅ ${typeText} movement created successfully!\n\nDetails:\n- Movement ID: ${movementResponse.id}\n- Type: ${typeText}\n- Amount: ${amountText}\n- Description: ${description}\n- Date: ${date}`;
            
            if (concept) {
                responseText += `\n- Concept: ${concept}`;
            }
            
            if (category) {
                responseText += `\n- Category: ${category}`;
            }
            
            responseText += `\n- Account ID: ${accountId}`;

            return {
                content: [{
                    type: "text",
                    text: responseText
                }]
            };
        } catch (error) {
            console.log('Error confirming movement:', error);
            return {
                content: [{
                    type: "text",
                    text: `Error confirming movement: ${error.message}`
                }]
            };
        }
    }
);

// Delete movement tool
server.registerTool("delete_movement",
    {
        title: "Delete movement",
        description: "Delete a specific movement by its ID. Use get_movements to see available movements and their IDs.",
        inputSchema: {
            movementId: z.string().min(1, "Movement ID is required - use get_movements to see available movements")
        }
    },
    async ({ movementId }) => {
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

            // Make request to your API to delete movement
            const apiUrl = process.env.API_SERVER_URL || 'http://localhost:3001';
            const response = await fetch(`${apiUrl}/movements/${movementId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authState.token}`,
                    'Content-Type': 'application/json',
                }
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

                // Handle not found errors
                if (response.status === 404) {
                    return {
                        content: [{
                            type: "text",
                            text: "Movement not found. Please check the movement ID or use get_movements to see your available movements."
                        }]
                    };
                }

                const errorData = await response.json();
                return {
                    content: [{
                        type: "text",
                        text: `Failed to delete movement: ${errorData.error || response.statusText}`
                    }]
                };
            }

            const deleteData = await response.json();
            
            return {
                content: [{
                    type: "text",
                    text: `✅ Movement deleted successfully!\n\nDeleted Movement Details:\n- Movement ID: ${deleteData.deletedMovement.id}\n- Type: ${deleteData.deletedMovement.type}\n- Amount: $${deleteData.deletedMovement.amount.toFixed(2)}\n- Description: ${deleteData.deletedMovement.description}\n- Account: ${deleteData.deletedMovement.accountName}`
                }]
            };
        } catch (error) {
            console.log('Error deleting movement:', error);
            return {
                content: [{
                    type: "text",
                    text: `Error deleting movement: ${error.message}`
                }]
            };
        }
    }
);

// Get user accounts tool
server.registerTool("get_accounts",
    {
        title: "Get user accounts",
        description: "Get all accounts for the currently logged in user",
        inputSchema: {}
    },
    async () => {
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

            // Make request to your API to get user accounts
            const apiUrl = process.env.API_SERVER_URL || 'http://localhost:3001';
            const response = await fetch(`${apiUrl}/accounts`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authState.token}`,
                    'Content-Type': 'application/json',
                }
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
                        text: `Failed to get accounts: ${errorData.error || response.statusText}`
                    }]
                };
            }

            const accountsData = await response.json();
            
            if (!accountsData.accounts || accountsData.accounts.length === 0) {
                return {
                    content: [{
                        type: "text",
                        text: "You don't have any accounts yet. Use the create_account tool to create your first account."
                    }]
                };
            }

            // Format the accounts list
            let accountsText = `You have ${accountsData.accounts.length} account(s):\n\n`;
            accountsData.accounts.forEach((account, index) => {
                accountsText += `${index + 1}. **${account.name}**\n`;
                accountsText += `   - ID: ${account.id}\n`;
                accountsText += `   - Type: ${account.type || 'Not specified'}\n`;
                accountsText += `   - Currency: ${account.currency}\n`;
                if (account.bank) {
                    accountsText += `   - Bank: ${account.bank}\n`;
                }
                accountsText += `   - Created: ${new Date(account.createdAt).toLocaleDateString()}\n\n`;
            });

            return {
                content: [{
                    type: "text",
                    text: accountsText
                }]
            };
        } catch (error) {
            console.log('Error getting accounts:', error);
            return {
                content: [{
                    type: "text",
                    text: `Error getting accounts: ${error.message}`
                }]
            };
        }
    }
);

// Get user movements tool
server.registerTool("get_movements",
    {
        title: "Get user movements",
        description: "Get all movements (income/expenses) for the currently logged in user",
        inputSchema: {
            limit: z.number().optional().default(20),
            accountId: z.string().optional()
        }
    },
    async ({ limit = 20, accountId }) => {
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

            // Build the API URL
            let apiUrl = process.env.API_SERVER_URL || 'http://localhost:3001';
            if (accountId) {
                apiUrl += `/movements/account/${accountId}`;
            } else {
                apiUrl += `/movements`;
            }

            // Add query parameters
            const params = new URLSearchParams();
            params.append('limit', limit.toString());
            if (params.toString()) {
                apiUrl += `?${params.toString()}`;
            }

            // Make request to your API to get user movements
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authState.token}`,
                    'Content-Type': 'application/json',
                }
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

                // Handle not found errors
                if (response.status === 404) {
                    return {
                        content: [{
                            type: "text",
                            text: "Account not found. Please check the account ID or use get_accounts to see your available accounts."
                        }]
                    };
                }

                const errorData = await response.json();
                return {
                    content: [{
                        type: "text",
                        text: `Failed to get movements: ${errorData.error || response.statusText}`
                    }]
                };
            }

            const movementsData = await response.json();
            
            if (!movementsData.movements || movementsData.movements.length === 0) {
                const noDataText = accountId 
                    ? "This account doesn't have any movements yet. Use the create_movement tool to add your first transaction."
                    : "You don't have any movements yet. Use the create_movement tool to add your first transaction.";
                
                return {
                    content: [{
                        type: "text",
                        text: noDataText
                    }]
                };
            }

            // Format the movements list
            let movementsText = `You have ${movementsData.movements.length} movement(s):\n\n`;
            
            // Calculate totals
            let totalIncome = 0;
            let totalExpenses = 0;
            
            movementsData.movements.forEach((movement, index) => {
                const typeText = movement.type === 'income' ? '💰 Income' : '💸 Expense';
                const amountText = `$${movement.amount.toFixed(2)}`;
                const dateText = new Date(movement.date).toLocaleDateString();
                
                movementsText += `${index + 1}. ${typeText}: ${amountText}\n`;
                movementsText += `   - Description: ${movement.description}\n`;
                movementsText += `   - Concept: ${movement.concept}\n`;
                movementsText += `   - Date: ${dateText}\n`;
                if (movement.category) {
                    movementsText += `   - Category: ${movement.category}\n`;
                }
                movementsText += `   - Movement ID: ${movement.id}\n`;
                movementsText += `   - Account ID: ${movement.accountId}\n\n`;
                
                // Add to totals
                if (movement.type === 'income') {
                    totalIncome += movement.amount;
                } else {
                    totalExpenses += movement.amount;
                }
            });

            // Add summary
            const balance = totalIncome - totalExpenses;
            movementsText += `\n**Summary:**\n`;
            movementsText += `- Total Income: $${totalIncome.toFixed(2)}\n`;
            movementsText += `- Total Expenses: $${totalExpenses.toFixed(2)}\n`;
            movementsText += `- Balance: $${balance.toFixed(2)}`;

            return {
                content: [{
                    type: "text",
                    text: movementsText
                }]
            };
        } catch (error) {
            console.log('Error getting movements:', error);
            return {
                content: [{
                    type: "text",
                    text: `Error getting movements: ${error.message}`
                }]
            };
        }
    }
);

// Update account tool
server.registerTool("update_account",
    {
        title: "Update account",
        description: "Update account details like name, bank, or type",
        inputSchema: {
            accountId: z.string().min(1, "Account ID is required"),
            name: z.string().optional(),
            bank: z.string().optional(),
            type: z.string().optional()
        }
    },
    async ({ accountId, name, bank, type }) => {
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

            // Validate that at least one field is provided
            if (!name && !bank && !type) {
                return {
                    content: [{
                        type: "text",
                        text: "Please provide at least one field to update: name, bank, or type."
                    }]
                };
            }

            // Prepare update data
            const updateData = {};
            if (name !== undefined) updateData.name = name;
            if (bank !== undefined) updateData.bank = bank;
            if (type !== undefined) updateData.type = type;

            // Make request to your API to update account
            const apiUrl = process.env.API_SERVER_URL || 'http://localhost:3001';
            const response = await fetch(`${apiUrl}/accounts/${accountId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${authState.token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData)
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

                // Handle not found errors
                if (response.status === 404) {
                    return {
                        content: [{
                            type: "text",
                            text: "Account not found. Please check the account ID or use get_accounts to see your available accounts."
                        }]
                    };
                }

                const errorData = await response.json();
                return {
                    content: [{
                        type: "text",
                        text: `Failed to update account: ${errorData.error || response.statusText}`
                    }]
                };
            }

            const accountData = await response.json();
            
            // Format the response
            let responseText = `Account updated successfully!\n\nUpdated Details:\n- Account ID: ${accountData.id}\n- Name: ${accountData.name}`;
            
            if (accountData.type) {
                responseText += `\n- Type: ${accountData.type}`;
            }
            
            if (accountData.bank) {
                responseText += `\n- Bank: ${accountData.bank}`;
            }

            return {
                content: [{
                    type: "text",
                    text: responseText
                }]
            };
        } catch (error) {
            console.log('Error updating account:', error);
            return {
                content: [{
                    type: "text",
                    text: `Error updating account: ${error.message}`
                }]
            };
        }
    }
);

// Update movement tool
server.registerTool("update_movement",
    {
        title: "Update movement",
        description: "Update movement details like type, concept, amount, description, date, or category",
        inputSchema: {
            movementId: z.string().min(1, "Movement ID is required"),
            type: z.enum(["income", "expense"]).optional(),
            concept: z.enum(["needs", "wants", "savings", "others"]).optional(),
            amount: z.number().positive().optional(),
            description: z.string().max(500).optional(),
            date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
            category: z.string().optional()
        }
    },
    async ({ movementId, type, concept, amount, description, date, category }) => {
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

            // Validate that at least one field is provided
            if (!type && !concept && !amount && !description && !date && !category) {
                return {
                    content: [{
                        type: "text",
                        text: "Please provide at least one field to update: type, concept, amount, description, date, or category."
                    }]
                };
            }

            // Validate concept requirement for expenses
            if (type === 'expense' && !concept) {
                return {
                    content: [{
                        type: "text",
                        text: "Concept is required for expenses. Please specify: needs, wants, savings, or others."
                    }]
                };
            }

            // Validate date format if provided
            if (date) {
                const movementDate = new Date(date);
                if (isNaN(movementDate.getTime())) {
                    return {
                        content: [{
                            type: "text",
                            text: "Invalid date format. Please use YYYY-MM-DD format (e.g., 2024-01-15)."
                        }]
                    };
                }
            }

            // Prepare update data
            const updateData = {};
            if (type !== undefined) updateData.type = type;
            if (concept !== undefined) updateData.concept = concept;
            if (amount !== undefined) updateData.amount = amount;
            if (description !== undefined) updateData.description = description;
            if (date !== undefined) updateData.date = date;
            if (category !== undefined) updateData.category = category;

            // Make request to your API to update movement
            const apiUrl = process.env.API_SERVER_URL || 'http://localhost:3001';
            const response = await fetch(`${apiUrl}/movements/${movementId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${authState.token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData)
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

                // Handle not found errors
                if (response.status === 404) {
                    return {
                        content: [{
                            type: "text",
                            text: "Movement not found. Please check the movement ID or use get_movements to see your available movements."
                        }]
                    };
                }

                const errorData = await response.json();
                return {
                    content: [{
                        type: "text",
                        text: `Failed to update movement: ${errorData.error || response.statusText}`
                    }]
                };
            }

            const movementData = await response.json();
            
            // Format the response
            const typeText = movementData.type === 'income' ? 'Income' : 'Expense';
            const amountText = `$${movementData.amount.toFixed(2)}`;
            
            let responseText = `Movement updated successfully!\n\nUpdated Details:\n- Movement ID: ${movementData.id}\n- Type: ${typeText}\n- Amount: ${amountText}\n- Description: ${movementData.description}\n- Date: ${new Date(movementData.date).toISOString().split('T')[0]}`;
            
            if (movementData.concept) {
                responseText += `\n- Concept: ${movementData.concept}`;
            }
            
            if (movementData.category) {
                responseText += `\n- Category: ${movementData.category}`;
            }
            
            responseText += `\n- Account ID: ${movementData.accountId}`;

            return {
                content: [{
                    type: "text",
                    text: responseText
                }]
            };
        } catch (error) {
            console.log('Error updating movement:', error);
            return {
                content: [{
                    type: "text",
                    text: `Error updating movement: ${error.message}`
                }]
            };
        }
    }
);

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
await server.connect(transport);
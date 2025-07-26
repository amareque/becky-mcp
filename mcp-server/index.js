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

// Create contact tool
server.registerTool("create_contact",
    {
        title: "Create contact",
        description: "Create a new contact for loan tracking",
        inputSchema: {
            name: z.string().min(1, "Name is required"),
            phone: z.string().optional(),
            email: z.string().email().optional(),
            nickname: z.string().optional(),
            notes: z.string().optional()
        }
    },
    async ({ name, phone, email, nickname, notes }) => {
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

            // Make request to API to create contact
            const apiUrl = process.env.API_SERVER_URL || 'http://localhost:3001';
            const response = await fetch(`${apiUrl}/contacts`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authState.token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name,
                    phone,
                    email,
                    nickname,
                    notes
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
                        text: `Failed to create contact: ${errorData.error || response.statusText}`
                    }]
                };
            }

            const contactData = await response.json();
            
            let responseText = `Contact created successfully!\n\nDetails:\n- Contact ID: ${contactData.id}\n- Name: ${contactData.name}`;
            
            if (contactData.nickname) {
                responseText += `\n- Nickname: ${contactData.nickname}`;
            }
            
            if (contactData.phone) {
                responseText += `\n- Phone: ${contactData.phone}`;
            }
            
            if (contactData.email) {
                responseText += `\n- Email: ${contactData.email}`;
            }
            
            if (contactData.notes) {
                responseText += `\n- Notes: ${contactData.notes}`;
            }

            return {
                content: [{
                    type: "text",
                    text: responseText
                }]
            };
        } catch (error) {
            console.log('Error creating contact:', error);
            return {
                content: [{
                    type: "text",
                    text: `Error creating contact: ${error.message}`
                }]
            };
        }
    }
);

// Get contacts tool
server.registerTool("get_contacts",
    {
        title: "Get contacts",
        description: "Get all contacts for loan tracking",
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

            // Make request to API to get contacts
            const apiUrl = process.env.API_SERVER_URL || 'http://localhost:3001';
            const response = await fetch(`${apiUrl}/contacts`, {
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
                        text: `Failed to get contacts: ${errorData.error || response.statusText}`
                    }]
                };
            }

            const contactsData = await response.json();
            
            if (!contactsData.contacts || contactsData.contacts.length === 0) {
                return {
                    content: [{
                        type: "text",
                        text: "You don't have any contacts yet. Use the create_contact tool to add contacts for loan tracking."
                    }]
                };
            }

            // Format the contacts list
            let contactsText = `You have ${contactsData.contacts.length} contact(s):\n\n`;
            contactsData.contacts.forEach((contact, index) => {
                contactsText += `${index + 1}. **${contact.name}**\n`;
                contactsText += `   - ID: ${contact.id}\n`;
                if (contact.nickname) {
                    contactsText += `   - Nickname: ${contact.nickname}\n`;
                }
                if (contact.phone) {
                    contactsText += `   - Phone: ${contact.phone}\n`;
                }
                if (contact.email) {
                    contactsText += `   - Email: ${contact.email}\n`;
                }
                if (contact.notes) {
                    contactsText += `   - Notes: ${contact.notes}\n`;
                }
                contactsText += `\n`;
            });

            return {
                content: [{
                    type: "text",
                    text: contactsText
                }]
            };
        } catch (error) {
            console.log('Error getting contacts:', error);
            return {
                content: [{
                    type: "text",
                    text: `Error getting contacts: ${error.message}`
                }]
            };
        }
    }
);

// Create shared expense tool
server.registerTool("create_shared_expense",
    {
        title: "Create shared expense",
        description: "Create a shared expense (like photocopies split among friends). Example: spent 100 pesos for photocopies among 5 people",
        inputSchema: {
            accountId: z.string().min(1, "Account ID is required"),
            totalAmount: z.number().positive("Total amount must be positive"),
            participants: z.number().min(2, "Must have at least 2 participants"),
            description: z.string().min(1, "Description is required"),
            date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
            category: z.string().optional(),
            concept: z.enum(["needs", "wants", "savings", "others"]).optional().default("others"),
            participantsList: z.array(z.string()).optional()
        }
    },
    async ({ accountId, totalAmount, participants, description, date, category, concept, participantsList }) => {
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

            // Validate date format
            const expenseDate = new Date(date);
            if (isNaN(expenseDate.getTime())) {
                return {
                    content: [{
                        type: "text",
                        text: "Invalid date format. Please use YYYY-MM-DD format (e.g., 2024-01-15)."
                    }]
                };
            }

            // Make request to API to create shared expense
            const apiUrl = process.env.API_SERVER_URL || 'http://localhost:3001';
            const response = await fetch(`${apiUrl}/loans/shared-expense`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authState.token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    accountId,
                    totalAmount,
                    participants,
                    description,
                    date,
                    category,
                    concept,
                    participantsList
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
                        text: `Failed to create shared expense: ${errorData.error || response.statusText}`
                    }]
                };
            }

            const responseData = await response.json();
            
            const myShare = responseData.summary.myShare.toFixed(2);
            const pendingAmount = responseData.summary.pendingAmount.toFixed(2);
            
            let responseText = `✅ Shared expense created successfully!\n\n📊 **Summary:**\n- Total spent: ${totalAmount.toFixed(2)}\n- Your share: ${myShare}\n- Amount others owe you: ${pendingAmount}\n- Split among: ${participants} people\n- Description: ${description}\n\n💰 **What happened:**\n- Created expense for your part (${myShare})\n- Created pending income for what others owe (${pendingAmount})`;
            
            if (participantsList && participantsList.length > 0) {
                responseText += `\n\n👥 **Participants:** ${participantsList.join(', ')}`;
            }

            return {
                content: [{
                    type: "text",
                    text: responseText
                }]
            };
        } catch (error) {
            console.log('Error creating shared expense:', error);
            return {
                content: [{
                    type: "text",
                    text: `Error creating shared expense: ${error.message}`
                }]
            };
        }
    }
);

// Create simple loan tool
server.registerTool("create_simple_loan",
    {
        title: "Create simple loan",
        description: "Record money you lent to someone or someone lent to you",
        inputSchema: {
            accountId: z.string().min(1, "Account ID is required"),
            amount: z.number().positive("Amount must be positive"),
            loanType: z.enum(["lent", "borrowed"], {
                errorMap: () => ({ message: "Loan type must be either 'lent' (you gave money) or 'borrowed' (you received money)" })
            }),
            description: z.string().min(1, "Description is required"),
            date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
            category: z.string().optional().default("loan"),
            relatedPerson: z.string().optional()
        }
    },
    async ({ accountId, amount, loanType, description, date, category, relatedPerson }) => {
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

            // Validate date format
            const loanDate = new Date(date);
            if (isNaN(loanDate.getTime())) {
                return {
                    content: [{
                        type: "text",
                        text: "Invalid date format. Please use YYYY-MM-DD format (e.g., 2024-01-15)."
                    }]
                };
            }

            // Make request to API to create simple loan
            const apiUrl = process.env.API_SERVER_URL || 'http://localhost:3001';
            const response = await fetch(`${apiUrl}/loans/simple-loan`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authState.token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    accountId,
                    amount,
                    loanType,
                    description,
                    date,
                    category,
                    relatedPerson
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
                        text: `Failed to create loan: ${errorData.error || response.statusText}`
                    }]
                };
            }

            const responseData = await response.json();
            
            const emoji = loanType === 'lent' ? '💸' : '💰';
            const action = loanType === 'lent' ? 'lent to' : 'borrowed from';
            
            let responseText = `${emoji} **Loan recorded successfully!**\n\n📊 **Details:**\n- Amount: ${amount.toFixed(2)}\n- Type: You ${action} someone\n- Description: ${description}\n- Date: ${date}`;
            
            if (relatedPerson) {
                responseText += `\n- Person: ${relatedPerson}`;
            }
            
            responseText += `\n\n💡 **Note:** This loan is now tracked as ${loanType === 'lent' ? 'money owed to you' : 'money you owe'}. Use get_pending_loans to see all your active loans.`;

            return {
                content: [{
                    type: "text",
                    text: responseText
                }]
            };
        } catch (error) {
            console.log('Error creating simple loan:', error);
            return {
                content: [{
                    type: "text",
                    text: `Error creating simple loan: ${error.message}`
                }]
            };
        }
    }
);

// Get pending loans tool
server.registerTool("get_pending_loans",
    {
        title: "Get pending loans",
        description: "Get all pending loans (money you lent or borrowed that hasn't been settled)",
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

            // Make request to API to get pending loans
            const apiUrl = process.env.API_SERVER_URL || 'http://localhost:3001';
            const response = await fetch(`${apiUrl}/loans/pending`, {
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
                        text: `Failed to get pending loans: ${errorData.error || response.statusText}`
                    }]
                };
            }

            const loansData = await response.json();
            
            if (!loansData.loans || loansData.loans.length === 0) {
                return {
                    content: [{
                        type: "text",
                        text: "You don't have any pending loans. All your loans are settled! 🎉"
                    }]
                };
            }

            // Format the loans list
            let loansText = `💰 **Pending Loans Summary:**\n\n`;
            loansText += `📊 **Totals:**\n`;
            loansText += `- Money owed TO you: ${loansData.summary.totalLent.toFixed(2)}\n`;
            loansText += `- Money you OWE: ${loansData.summary.totalBorrowed.toFixed(2)}\n`;
            loansText += `- Net balance: ${loansData.summary.netBalance.toFixed(2)} ${loansData.summary.netBalance >= 0 ? '(in your favor)' : '(you owe)'}\n\n`;
            
            loansText += `📋 **Individual Loans (${loansData.loans.length}):**\n\n`;
            
            loansData.loans.forEach((loan, index) => {
                const emoji = loan.loanType === 'lent' || loan.loanType === 'shared' ? '💸' : '💰';
                const typeText = loan.loanType === 'lent' ? 'You lent' : loan.loanType === 'borrowed' ? 'You borrowed' : 'Shared expense';
                const pendingAmount = loan.pendingAmount || 0;
                const dateText = new Date(loan.date).toLocaleDateString();
                
                loansText += `${index + 1}. ${emoji} **${typeText}**: ${pendingAmount.toFixed(2)}\n`;
                loansText += `   - Description: ${loan.description}\n`;
                loansText += `   - Date: ${dateText}\n`;
                
                if (loan.loanType === 'shared' && loan.originalAmount) {
                    loansText += `   - Original total: ${loan.originalAmount.toFixed(2)} (${loan.participants} people)\n`;
                }
                
                if (loan.relatedPeople && Array.isArray(loan.relatedPeople) && loan.relatedPeople.length > 0) {
                    loansText += `   - People: ${loan.relatedPeople.join(', ')}\n`;
                }
                
                loansText += `   - Loan ID: ${loan.id}\n\n`;
            });
            
            loansText += `💡 **Tip:** Use settle_loan tool to mark loans as paid when you receive/pay money.`;

            return {
                content: [{
                    type: "text",
                    text: loansText
                }]
            };
        } catch (error) {
            console.log('Error getting pending loans:', error);
            return {
                content: [{
                    type: "text",
                    text: `Error getting pending loans: ${error.message}`
                }]
            };
        }
    }
);

// Settle loan tool
server.registerTool("settle_loan",
    {
        title: "Settle loan",
        description: "Mark a loan as paid (fully or partially)",
        inputSchema: {
            movementId: z.string().min(1, "Movement ID (loan ID) is required"),
            amountPaid: z.number().positive().optional(),
            description: z.string().optional()
        }
    },
    async ({ movementId, amountPaid, description }) => {
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

            // Make request to API to settle loan
            const apiUrl = process.env.API_SERVER_URL || 'http://localhost:3001';
            const response = await fetch(`${apiUrl}/loans/${movementId}/settle`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${authState.token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    amountPaid,
                    description
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

                // Handle not found errors
                if (response.status === 404) {
                    return {
                        content: [{
                            type: "text",
                            text: "Loan not found. Please check the loan ID or use get_pending_loans to see your active loans."
                        }]
                    };
                }

                const errorData = await response.json();
                return {
                    content: [{
                        type: "text",
                        text: `Failed to settle loan: ${errorData.error || response.statusText}`
                    }]
                };
            }

            const responseData = await response.json();
            
            const emoji = responseData.status === 'settled' ? '✅' : '⏳';
            const statusText = responseData.status === 'settled' ? 'FULLY SETTLED' : 'PARTIALLY PAID';
            
            let responseText = `${emoji} **Loan settlement recorded!**\n\n📊 **Settlement Details:**\n- Amount paid: ${(amountPaid || 0).toFixed(2)}\n- Remaining amount: ${responseData.remainingAmount.toFixed(2)}\n- Status: ${statusText}`;
            
            if (responseData.status === 'settled') {
                responseText += `\n\n🎉 **Congratulations!** This loan is now fully settled.`;
            } else {
                responseText += `\n\n💡 **Note:** There's still ${responseData.remainingAmount.toFixed(2)} pending for this loan.`;
            }

            return {
                content: [{
                    type: "text",
                    text: responseText
                }]
            };
        } catch (error) {
            console.log('Error settling loan:', error);
            return {
                content: [{
                    type: "text",
                    text: `Error settling loan: ${error.message}`
                }]
            };
        }
    }
);

// Process receipt image tool
server.registerTool("process_receipt_image",
    {
        title: "Process receipt image",
        description: "Extract expense data from receipt/invoice images and create movement automatically",
        inputSchema: {
            imageBase64: z.string().min(1, "Base64 image data is required"),
            accountId: z.string().min(1, "Account ID is required"),
            mimeType: z.string().optional().default("image/jpeg"),
            autoCreate: z.boolean().optional().default(false)
        }
    },
    async ({ imageBase64, accountId, mimeType, autoCreate }) => {
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

            // Step 1: Process the image to extract data
            const apiUrl = process.env.API_SERVER_URL || 'http://localhost:3001';
            const extractResponse = await fetch(`${apiUrl}/receipts/extract-receipt-data`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authState.token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    imageBase64,
                    mimeType
                })
            });

            if (!extractResponse.ok) {
                // Handle auth errors
                if (extractResponse.status === 401) {
                    await clearAuthState();
                    return {
                        content: [{
                            type: "text",
                            text: "Authentication failed. Please login again."
                        }]
                    };
                }

                const errorData = await extractResponse.json();
                return {
                    content: [{
                        type: "text",
                        text: `Failed to process image: ${errorData.error || extractResponse.statusText}`
                    }]
                };
            }

            const extractData = await extractResponse.json();
            const { extractedData } = extractData;

            // If auto-create is false, just return the extracted data for review
            if (!autoCreate) {
                let responseText = `📸 **Imagen procesada exitosamente**\n\n`;
                responseText += `🔍 **Datos extraídos:**\n`;
                
                if (extractedData.amount) {
                    responseText += `- 💰 Monto: ${extractedData.amount}\n`;
                }
                if (extractedData.merchant) {
                    responseText += `- 🏪 Comercio: ${extractedData.merchant}\n`;
                }
                if (extractedData.date) {
                    responseText += `- 📅 Fecha: ${extractedData.date}\n`;
                }
                if (extractedData.category) {
                    responseText += `- 📂 Categoría sugerida: ${extractedData.category}\n`;
                }
                
                responseText += `\n📊 **Confianza del AI**: ${(extractedData.confidence * 100).toFixed(1)}%\n`;
                
                if (extractedData.needsReview) {
                    responseText += `\n⚠️ **Se recomienda revisar los datos antes de crear el gasto.**\n`;
                    responseText += `\n💡 Para crear el gasto automáticamente, usa: process_receipt_image con autoCreate=true`;
                } else {
                    responseText += `\n✅ **Los datos se ven correctos. Listo para crear el gasto.**`;
                }

                return {
                    content: [{
                        type: "text",
                        text: responseText
                    }]
                };
            }

            // If auto-create is true, create the expense automatically
            if (!extractedData.amount || !extractedData.merchant) {
                return {
                    content: [{
                        type: "text",
                        text: "❌ No se pudo extraer información suficiente de la imagen para crear el gasto automáticamente. Monto y comercio son requeridos."
                    }]
                };
            }

            // Create the expense
            const createResponse = await fetch(`${apiUrl}/receipts/create-expense-from-receipt`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authState.token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    accountId,
                    amount: extractedData.amount,
                    merchant: extractedData.merchant,
                    date: extractedData.date || new Date().toISOString().split('T')[0],
                    category: extractedData.category || 'receipt',
                    concept: 'others',
                    extractedData
                })
            });

            if (!createResponse.ok) {
                const errorData = await createResponse.json();
                return {
                    content: [{
                        type: "text",
                        text: `Failed to create expense: ${errorData.error || createResponse.statusText}`
                    }]
                };
            }

            const createData = await createResponse.json();
            
            let responseText = `✅ **Gasto creado automáticamente desde imagen**\n\n`;
            responseText += `📊 **Detalles del gasto:**\n`;
            responseText += `- 💰 Monto: ${createData.movement.amount}\n`;
            responseText += `- 🏪 Comercio: ${extractedData.merchant}\n`;
            responseText += `- 📅 Fecha: ${createData.movement.date.split('T')[0]}\n`;
            responseText += `- 📂 Categoría: ${createData.movement.category}\n`;
            responseText += `- 🏦 Cuenta: ${accountId}\n`;
            responseText += `- 🆔 ID del movimiento: ${createData.movement.id}\n`;
            
            responseText += `\n🎯 **Procesamiento de imagen exitoso!**`;

            return {
                content: [{
                    type: "text",
                    text: responseText
                }]
            };
        } catch (error) {
            console.log('Error processing receipt image:', error);
            return {
                content: [{
                    type: "text",
                    text: `Error processing receipt image: ${error.message}`
                }]
            };
        }
    }
);

// Extract data from receipt tool (without creating expense)
server.registerTool("extract_receipt_data",
    {
        title: "Extract data from receipt",
        description: "Extract data from receipt/invoice image without creating expense (for review)",
        inputSchema: {
            imageBase64: z.string().min(1, "Base64 image data is required"),
            mimeType: z.string().optional().default("image/jpeg")
        }
    },
    async ({ imageBase64, mimeType }) => {
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

            // Extract data from image
            const apiUrl = process.env.API_SERVER_URL || 'http://localhost:3001';
            const response = await fetch(`${apiUrl}/receipts/extract-receipt-data`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authState.token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    imageBase64,
                    mimeType
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
                        text: `Failed to extract receipt data: ${errorData.error || response.statusText}`
                    }]
                };
            }

            const data = await response.json();
            const { extractedData } = data;
            
            let responseText = `📸 **Análisis de imagen completado**\n\n`;
            responseText += `🔍 **Datos extraídos:**\n`;
            
            if (extractedData.amount) {
                responseText += `- 💰 **Monto**: ${extractedData.amount}\n`;
            } else {
                responseText += `- 💰 **Monto**: No detectado\n`;
            }
            
            if (extractedData.merchant) {
                responseText += `- 🏪 **Comercio**: ${extractedData.merchant}\n`;
            } else {
                responseText += `- 🏪 **Comercio**: No detectado\n`;
            }
            
            if (extractedData.date) {
                responseText += `- 📅 **Fecha**: ${extractedData.date}\n`;
            } else {
                responseText += `- 📅 **Fecha**: No detectada\n`;
            }
            
            if (extractedData.category) {
                responseText += `- 📂 **Categoría sugerida**: ${extractedData.category}\n`;
            }
            
            if (extractedData.items && extractedData.items.length > 0) {
                responseText += `- 🛍️ **Items detectados**: ${extractedData.items.length} productos\n`;
            }
            
            responseText += `\n📊 **Confianza del AI**: ${(extractedData.confidence * 100).toFixed(1)}%\n`;
            
            if (extractedData.rawText) {
                responseText += `\n📝 **Texto detectado**:\n${extractedData.rawText.substring(0, 200)}${extractedData.rawText.length > 200 ? '...' : ''}\n`;
            }
            
            if (extractedData.needsReview) {
                responseText += `\n⚠️ **Recomendación**: Revisar los datos antes de crear el gasto.\n`;
            } else {
                responseText += `\n✅ **Los datos se ven correctos.**\n`;
            }
            
            responseText += `\n💡 **Siguiente paso**: Usar process_receipt_image para crear el gasto automáticamente.`;

            return {
                content: [{
                    type: "text",
                    text: responseText
                }]
            };
        } catch (error) {
            console.log('Error extracting receipt data:', error);
            return {
                content: [{
                    type: "text",
                    text: `Error extracting receipt data: ${error.message}`
                }]
            };
        }
    }
);

// Create expense from manual data (when AI extraction needs correction)
server.registerTool("create_expense_from_receipt_manual",
    {
        title: "Create expense from receipt (manual data)",
        description: "Create expense from receipt with manually corrected data",
        inputSchema: {
            accountId: z.string().min(1, "Account ID is required"),
            amount: z.number().positive("Amount must be positive"),
            merchant: z.string().min(1, "Merchant name is required"),
            date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
            category: z.string().optional().default("receipt"),
            concept: z.enum(["needs", "wants", "savings", "others"]).optional().default("others"),
            notes: z.string().optional()
        }
    },
    async ({ accountId, amount, merchant, date, category, concept, notes }) => {
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

            // Create the expense
            const apiUrl = process.env.API_SERVER_URL || 'http://localhost:3001';
            const response = await fetch(`${apiUrl}/receipts/create-expense-from-receipt`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authState.token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    accountId,
                    amount,
                    merchant,
                    date,
                    category,
                    concept,
                    extractedData: {
                        amount,
                        merchant,
                        date,
                        category,
                        confidence: 1.0, // Manual entry = 100% confidence
                        needsReview: false,
                        notes
                    }
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
                        text: `Failed to create expense: ${errorData.error || response.statusText}`
                    }]
                };
            }

            const data = await response.json();
            
            let responseText = `✅ **Gasto creado exitosamente desde recibo**\n\n`;
            responseText += `📊 **Detalles:**\n`;
            responseText += `- 💰 Monto: ${amount.toFixed(2)}\n`;
            responseText += `- 🏪 Comercio: ${merchant}\n`;
            responseText += `- 📅 Fecha: ${date}\n`;
            responseText += `- 📂 Categoría: ${category}\n`;
            responseText += `- 🏷️ Concepto: ${concept}\n`;
            responseText += `- 🏦 Cuenta: ${accountId}\n`;
            responseText += `- 🆔 Movement ID: ${data.movement.id}\n`;
            
            if (notes) {
                responseText += `- 📝 Notas: ${notes}\n`;
            }
            
            responseText += `\n🎯 **Gasto registrado correctamente!**`;

            return {
                content: [{
                    type: "text",
                    text: responseText
                }]
            };
        } catch (error) {
            console.log('Error creating expense from receipt manual:', error);
            return {
                content: [{
                    type: "text",
                    text: `Error creating expense: ${error.message}`
                }]
            };
        }
    }
);

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
await server.connect(transport);
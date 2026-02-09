// MCP Protocol interfaces
interface MCPTextContent {
  type: "text";
  text: string;
}

interface MCPResult {
  content: MCPTextContent[];
  isError?: boolean;
}

// Goal management interfaces
interface GoalsData {
  yearly: Record<number, string[]>;
  quarterly: Record<string, string[]>;
  monthly: Record<string, string[]>;
  weekly: Record<string, string[]>;
}

interface ReadGoalsRequest {
  // No properties needed
}

interface SetYearlyGoalsRequest {
  year?: number;
  goals: string[];
}

interface SetQuarterlyGoalsRequest {
  quarter: string;
  goals: string[];
}

interface SetMonthlyGoalsRequest {
  month: string;
  goals: string[];
}

interface SetWeeklyGoalsRequest {
  week: string;
  goals: string[];
}

// On-call rotation interfaces
interface OnCallRotation {
  users: string[];
  currentIndex: number;
  skipRequests: Array<{ username: string; reason?: string; timestamp: number }>;
  swapRequests: Array<{ fromUser: string; toUser: string; timestamp: number }>;
  lastUpdated: number;
}

interface GetOnCallRotationRequest {
  // No properties needed
}

interface GetCurrentOnCallRequest {
  // No properties needed
}

interface AddUserToRotationRequest {
  username: string;
}

interface RemoveUserFromRotationRequest {
  username: string;
}

interface SkipRotationRequest {
  username: string;
  reason?: string;
}

interface SwapRotationRequest {
  user1: string;
  user2: string;
}

interface AdvanceRotationRequest {
  // No properties needed
}

// Default template data
const defaultGoalsData: GoalsData = {
  yearly: {},
  quarterly: {},
  monthly: {},
  weekly: {},
};

const defaultOnCallRotation: OnCallRotation = {
  users: [],
  currentIndex: 0,
  skipRequests: [],
  swapRequests: [],
  lastUpdated: Date.now(),
};

/**
 * Read all goals including yearly, quarterly, monthly, and weekly goals
 */
function read_goals(request: ReadGoalsRequest, env: Environment): MCPResult {
  try {
    const goalsData =
      (getState(env, "goalsData") as GoalsData) ?? defaultGoalsData;

    let summary = `Goals Summary:\n`;
    summary += `• ${Object.keys(goalsData.yearly).length} years with goals\n`;
    summary += `• ${Object.keys(goalsData.quarterly).length} quarters with goals\n`;
    summary += `• ${Object.keys(goalsData.monthly).length} months with goals\n`;
    summary += `• ${Object.keys(goalsData.weekly).length} weeks with goals\n`;

    return {
      content: [
        {
          type: "text",
          text: `${summary}\n\nAll Goals:\n${JSON.stringify(goalsData, null, 2)}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error reading goals: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Set yearly goals for a specific year
 */
function set_yearly_goals(
  request: SetYearlyGoalsRequest,
  env: Environment,
): MCPResult {
  try {
    if (!request.goals || !Array.isArray(request.goals)) {
      throw new Error("goals parameter is required and must be an array");
    }

    let goalsData =
      (getState(env, "goalsData") as GoalsData) ?? defaultGoalsData;

    // Default to current year if not specified
    const year = request.year ?? new Date().getFullYear();

    goalsData.yearly[year] = request.goals;

    if (!setState(env, "goalsData", goalsData)) {
      console.log("State was not set, check logs for the error");
    }

    return {
      content: [
        {
          type: "text",
          text: `Successfully set ${request.goals.length} yearly goals for ${year}:\n${request.goals.map((g) => `  • ${g}`).join("\n")}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error setting yearly goals: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Set quarterly goals for a specific quarter
 */
function set_quarterly_goals(
  request: SetQuarterlyGoalsRequest,
  env: Environment,
): MCPResult {
  try {
    if (!request.quarter || typeof request.quarter !== "string") {
      throw new Error("quarter parameter is required and must be a string");
    }
    if (!request.goals || !Array.isArray(request.goals)) {
      throw new Error("goals parameter is required and must be an array");
    }

    let goalsData =
      (getState(env, "goalsData") as GoalsData) ?? defaultGoalsData;

    goalsData.quarterly[request.quarter] = request.goals;

    if (!setState(env, "goalsData", goalsData)) {
      console.log("State was not set, check logs for the error");
    }

    return {
      content: [
        {
          type: "text",
          text: `Successfully set ${request.goals.length} quarterly goals for ${request.quarter}:\n${request.goals.map((g) => `  • ${g}`).join("\n")}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error setting quarterly goals: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Set monthly goals for a specific month
 */
function set_monthly_goals(
  request: SetMonthlyGoalsRequest,
  env: Environment,
): MCPResult {
  try {
    if (!request.month || typeof request.month !== "string") {
      throw new Error("month parameter is required and must be a string");
    }
    if (!request.goals || !Array.isArray(request.goals)) {
      throw new Error("goals parameter is required and must be an array");
    }

    let goalsData =
      (getState(env, "goalsData") as GoalsData) ?? defaultGoalsData;

    goalsData.monthly[request.month] = request.goals;

    if (!setState(env, "goalsData", goalsData)) {
      console.log("State was not set, check logs for the error");
    }

    return {
      content: [
        {
          type: "text",
          text: `Successfully set ${request.goals.length} monthly goals for ${request.month}:\n${request.goals.map((g) => `  • ${g}`).join("\n")}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error setting monthly goals: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Set weekly goals for a specific week
 */
function set_weekly_goals(
  request: SetWeeklyGoalsRequest,
  env: Environment,
): MCPResult {
  try {
    if (!request.week || typeof request.week !== "string") {
      throw new Error("week parameter is required and must be a string");
    }
    if (!request.goals || !Array.isArray(request.goals)) {
      throw new Error("goals parameter is required and must be an array");
    }

    let goalsData =
      (getState(env, "goalsData") as GoalsData) ?? defaultGoalsData;

    goalsData.weekly[request.week] = request.goals;

    if (!setState(env, "goalsData", goalsData)) {
      console.log("State was not set, check logs for the error");
    }

    return {
      content: [
        {
          type: "text",
          text: `Successfully set ${request.goals.length} weekly goals for ${request.week}:\n${request.goals.map((g) => `  • ${g}`).join("\n")}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error setting weekly goals: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Get the current on-call rotation schedule
 */
function get_on_call_rotation(
  request: GetOnCallRotationRequest,
  env: Environment,
): MCPResult {
  try {
    const rotation =
      (getState(env, "onCallRotation") as OnCallRotation) ??
      defaultOnCallRotation;

    let summary = `On-Call Rotation Schedule:\n`;
    summary += `• Total users in rotation: ${rotation.users.length}\n`;
    summary += `• Current on-call index: ${rotation.currentIndex}\n`;
    summary += `• Pending skip requests: ${rotation.skipRequests.length}\n`;
    summary += `• Pending swap requests: ${rotation.swapRequests.length}\n`;
    summary += `• Last updated: ${new Date(rotation.lastUpdated).toISOString()}\n`;

    let rotationOrder = `\nRotation Order:\n`;
    if (rotation.users.length === 0) {
      rotationOrder += `  (No users in rotation)\n`;
    } else {
      rotation.users.forEach((user, index) => {
        const marker = index === rotation.currentIndex ? " 👈 CURRENT" : "";
        rotationOrder += `  ${index + 1}. ${user}${marker}\n`;
      });
    }

    let skipInfo = `\nSkip Requests:\n`;
    if (rotation.skipRequests.length === 0) {
      skipInfo += `  (No pending skip requests)\n`;
    } else {
      rotation.skipRequests.forEach((skip) => {
        skipInfo += `  • ${skip.username}${skip.reason ? ` (${skip.reason})` : ""}\n`;
      });
    }

    let swapInfo = `\nSwap Requests:\n`;
    if (rotation.swapRequests.length === 0) {
      swapInfo += `  (No pending swap requests)\n`;
    } else {
      rotation.swapRequests.forEach((swap) => {
        swapInfo += `  • ${swap.fromUser} ↔ ${swap.toUser}\n`;
      });
    }

    return {
      content: [
        {
          type: "text",
          text: `${summary}${rotationOrder}${skipInfo}${swapInfo}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error getting on-call rotation: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Get the user who is currently on-call
 */
function get_current_on_call(
  request: GetCurrentOnCallRequest,
  env: Environment,
): MCPResult {
  try {
    const rotation =
      (getState(env, "onCallRotation") as OnCallRotation) ??
      defaultOnCallRotation;

    if (rotation.users.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No users are currently in the on-call rotation. Please add users first using add_user_to_rotation.`,
          },
        ],
      };
    }

    if (rotation.currentIndex >= rotation.users.length) {
      rotation.currentIndex = 0;
      if (!setState(env, "onCallRotation", rotation)) {
        console.log("State was not set, check logs for the error");
      }
    }

    const currentUser = rotation.users[rotation.currentIndex];

    // Check if current user has a skip request
    const skipRequest = rotation.skipRequests.find(
      (s) => s.username === currentUser,
    );
    if (skipRequest) {
      return {
        content: [
          {
            type: "text",
            text: `Scheduled on-call: ${currentUser}\n⚠️ Note: This user has a pending skip request${skipRequest.reason ? ` (Reason: ${skipRequest.reason})` : ""}.\nPlease advance the rotation to move to the next available user.`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Currently on-call: ${currentUser}\n\nRotation position: ${rotation.currentIndex + 1} of ${rotation.users.length}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error getting current on-call: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Add a user to the on-call rotation
 */
function add_user_to_rotation(
  request: AddUserToRotationRequest,
  env: Environment,
): MCPResult {
  try {
    if (!request.username || typeof request.username !== "string") {
      throw new Error("username parameter is required and must be a string");
    }

    let rotation =
      (getState(env, "onCallRotation") as OnCallRotation) ??
      defaultOnCallRotation;

    if (rotation.users.includes(request.username)) {
      return {
        content: [
          {
            type: "text",
            text: `User "${request.username}" is already in the on-call rotation.`,
          },
        ],
      };
    }

    rotation.users.push(request.username);
    rotation.lastUpdated = Date.now();

    if (!setState(env, "onCallRotation", rotation)) {
      console.log("State was not set, check logs for the error");
    }

    return {
      content: [
        {
          type: "text",
          text: `Successfully added "${request.username}" to the on-call rotation.\n\nNew rotation order (${rotation.users.length} users):\n${rotation.users.map((u, i) => `  ${i + 1}. ${u}`).join("\n")}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error adding user to rotation: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Remove a user from the on-call rotation
 */
function remove_user_from_rotation(
  request: RemoveUserFromRotationRequest,
  env: Environment,
): MCPResult {
  try {
    if (!request.username || typeof request.username !== "string") {
      throw new Error("username parameter is required and must be a string");
    }

    let rotation =
      (getState(env, "onCallRotation") as OnCallRotation) ??
      defaultOnCallRotation;

    if (!rotation.users.includes(request.username)) {
      return {
        content: [
          {
            type: "text",
            text: `User "${request.username}" is not in the on-call rotation.`,
          },
        ],
      };
    }

    // Find the index before removal
    const userIndex = rotation.users.indexOf(request.username);

    // Remove the user
    rotation.users = rotation.users.filter((u) => u !== request.username);

    // Adjust current index if necessary
    if (
      rotation.currentIndex >= rotation.users.length &&
      rotation.users.length > 0
    ) {
      rotation.currentIndex = 0;
    }
    if (userIndex < rotation.currentIndex) {
      rotation.currentIndex--;
    }

    // Remove any pending skip or swap requests for this user
    rotation.skipRequests = rotation.skipRequests.filter(
      (s) => s.username !== request.username,
    );
    rotation.swapRequests = rotation.swapRequests.filter(
      (s) => s.fromUser !== request.username && s.toUser !== request.username,
    );

    rotation.lastUpdated = Date.now();

    if (!setState(env, "onCallRotation", rotation)) {
      console.log("State was not set, check logs for the error");
    }

    return {
      content: [
        {
          type: "text",
          text: `Successfully removed "${request.username}" from the on-call rotation.\n\nRemaining users (${rotation.users.length}):\n${rotation.users.map((u, i) => `  ${i + 1}. ${u}`).join("\n") || "  (No users remaining)"}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error removing user from rotation: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Allow a user to skip their upcoming on-call rotation
 */
function skip_rotation(
  request: SkipRotationRequest,
  env: Environment,
): MCPResult {
  try {
    if (!request.username || typeof request.username !== "string") {
      throw new Error("username parameter is required and must be a string");
    }

    let rotation =
      (getState(env, "onCallRotation") as OnCallRotation) ??
      defaultOnCallRotation;

    if (!rotation.users.includes(request.username)) {
      return {
        content: [
          {
            type: "text",
            text: `User "${request.username}" is not in the on-call rotation and cannot skip.`,
          },
        ],
      };
    }

    // Check if there's already a skip request for this user
    const existingSkip = rotation.skipRequests.find(
      (s) => s.username === request.username,
    );
    if (existingSkip) {
      return {
        content: [
          {
            type: "text",
            text: `User "${request.username}" already has a pending skip request${existingSkip.reason ? ` (Reason: ${existingSkip.reason})` : ""}.`,
          },
        ],
      };
    }

    // Add the skip request
    rotation.skipRequests.push({
      username: request.username,
      reason: request.reason,
      timestamp: Date.now(),
    });
    rotation.lastUpdated = Date.now();

    if (!setState(env, "onCallRotation", rotation)) {
      console.log("State was not set, check logs for the error");
    }

    return {
      content: [
        {
          type: "text",
          text: `Successfully registered skip request for "${request.username}"${request.reason ? `. Reason: ${request.reason}` : ""}.\n\nThis user will be skipped when it's their turn in the rotation.`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error processing skip rotation request: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Swap on-call rotations between two users
 */
function swap_rotation(
  request: SwapRotationRequest,
  env: Environment,
): MCPResult {
  try {
    if (!request.user1 || typeof request.user1 !== "string") {
      throw new Error("user1 parameter is required and must be a string");
    }
    if (!request.user2 || typeof request.user2 !== "string") {
      throw new Error("user2 parameter is required and must be a string");
    }

    let rotation =
      (getState(env, "onCallRotation") as OnCallRotation) ??
      defaultOnCallRotation;

    if (!rotation.users.includes(request.user1)) {
      return {
        content: [
          {
            type: "text",
            text: `User "${request.user1}" is not in the on-call rotation.`,
          },
        ],
      };
    }

    if (!rotation.users.includes(request.user2)) {
      return {
        content: [
          {
            type: "text",
            text: `User "${request.user2}" is not in the on-call rotation.`,
          },
        ],
      };
    }

    // Find indices of both users
    const index1 = rotation.users.indexOf(request.user1);
    const index2 = rotation.users.indexOf(request.user2);

    // Swap the positions
    [rotation.users[index1], rotation.users[index2]] = [
      rotation.users[index2],
      rotation.users[index1],
    ];

    // Update current index if it was affected
    if (rotation.currentIndex === index1) {
      rotation.currentIndex = index2;
    } else if (rotation.currentIndex === index2) {
      rotation.currentIndex = index1;
    }

    // Clean up any related skip requests (since positions changed)
    rotation.skipRequests = [];
    rotation.lastUpdated = Date.now();

    if (!setState(env, "onCallRotation", rotation)) {
      console.log("State was not set, check logs for the error");
    }

    return {
      content: [
        {
          type: "text",
          text: `Successfully swapped rotation positions:\n  • "${request.user1}" moved from position ${index1 + 1} to ${index2 + 1}\n  • "${request.user2}" moved from position ${index2 + 1} to ${index1 + 1}\n\nUpdated rotation order:\n${rotation.users.map((u, i) => `  ${i + 1}. ${u}${i === rotation.currentIndex ? " 👈 CURRENT" : ""}`).join("\n")}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error swapping rotations: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Advance the on-call rotation to the next user, looping back to the beginning if needed
 */
function advance_rotation(
  request: AdvanceRotationRequest,
  env: Environment,
): MCPResult {
  try {
    let rotation =
      (getState(env, "onCallRotation") as OnCallRotation) ??
      defaultOnCallRotation;

    if (rotation.users.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No users are currently in the on-call rotation. Please add users first using add_user_to_rotation.`,
          },
        ],
        isError: true,
      };
    }

    // Store the previous on-call user
    const previousUser = rotation.users[rotation.currentIndex];

    // Move to the next user
    rotation.currentIndex++;

    // Loop back to the beginning if we reached the end
    if (rotation.currentIndex >= rotation.users.length) {
      rotation.currentIndex = 0;
    }

    // Get the new on-call user
    let newUser = rotation.users[rotation.currentIndex];

    // Check if the new user has a skip request
    let skipCount = 0;
    const maxSkipAttempts = rotation.users.length; // Prevent infinite loop

    while (
      rotation.skipRequests.some((s) => s.username === newUser) &&
      skipCount < maxSkipAttempts
    ) {
      // Remove the skip request and move to next user
      rotation.skipRequests = rotation.skipRequests.filter(
        (s) => s.username !== newUser,
      );
      rotation.currentIndex++;

      if (rotation.currentIndex >= rotation.users.length) {
        rotation.currentIndex = 0;
      }

      newUser = rotation.users[rotation.currentIndex];
      skipCount++;
    }

    // Update timestamp
    rotation.lastUpdated = Date.now();

    if (!setState(env, "onCallRotation", rotation)) {
      console.log("State was not set, check logs for the error");
    }

    let message = `Successfully advanced on-call rotation:\\n  • Previous on-call: ${previousUser}\\n  • New on-call: ${newUser}`;

    if (skipCount > 0) {
      message += `\\n  • Skipped ${skipCount} user(s) due to pending skip requests`;
    }

    message += `\\n\\nUpdated rotation order:\\n${rotation.users
      .map(
        (u, i) =>
          `  ${i + 1}. ${u}${i === rotation.currentIndex ? " 👈 CURRENT" : ""}`,
      )
      .join("\\n")}`;

    return {
      content: [
        {
          type: "text",
          text: message,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error advancing rotation: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

// Export the functions and types for use in other modules
export {
  read_goals,
  set_yearly_goals,
  set_quarterly_goals,
  set_monthly_goals,
  set_weekly_goals,
  get_on_call_rotation,
  get_current_on_call,
  add_user_to_rotation,
  remove_user_from_rotation,
  skip_rotation,
  swap_rotation,
  advance_rotation,
};

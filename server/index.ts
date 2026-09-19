import express from "express";
import cors from "cors";
import session from "express-session";
import { PrismaClient } from "@prisma/client";

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

const prisma = new PrismaClient();

app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || "fallback_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    },
  })
);

// Declare session data type
declare module "express-session" {
  interface SessionData {
    userId: string;
    accessToken?: string;
  }
}

app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "ContribHQ API is running" });
});

// OAuth Login Redirect
app.get("/api/auth/github", (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = `http://localhost:${PORT}/api/auth/github/callback`;
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user:email`;
  res.redirect(githubAuthUrl);
});

// OAuth Callback
app.get("/api/auth/github/callback", async (req, res) => {
  const code = req.query.code as string;
  
  if (!code) {
    return res.status(400).send("No code provided");
  }

  try {
    // 1. Exchange code for access token
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return res.status(400).send("Failed to get access token");
    }

    // 2. Get user info from GitHub
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const userData = await userResponse.json();

    // 3. Upsert user in database
    const user = await prisma.user.upsert({
      where: { githubId: String(userData.id) },
      update: {
        username: userData.login,
        displayName: userData.name || userData.login,
        avatarUrl: userData.avatar_url,
        email: userData.email,
      },
      create: {
        githubId: String(userData.id),
        username: userData.login,
        displayName: userData.name || userData.login,
        avatarUrl: userData.avatar_url,
        email: userData.email,
      },
    });

    // 4. Set session
    req.session.userId = user.id;
    req.session.accessToken = accessToken;

    // 5. Redirect to frontend
    res.redirect(FRONTEND_URL);
  } catch (error) {
    console.error("GitHub Auth Error:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Get current user
app.get("/api/auth/me", async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.session.userId },
    });

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Logout
app.post("/api/auth/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Could not log out" });
    }
    res.clearCookie("connect.sid");
    res.json({ success: true });
  });
});

// Get GitHub Issues
app.get("/api/issues", async (req, res) => {
  if (!req.session.userId || !req.session.accessToken) {
    return res.status(401).json({ error: "Unauthorized or missing GitHub token" });
  }

  const query = req.query.q ? String(req.query.q) : "";
  const page = req.query.page ? parseInt(String(req.query.page)) : 1;
  const perPage = 20;

  // Construct GitHub Search Query
  // is:issue is:open no:assignee label:"good first issue" OR label:"help wanted"
  const baseQuery = 'is:issue is:open no:assignee label:"good first issue",label:"help wanted"';
  const searchQuery = query ? `${query} ${baseQuery}` : baseQuery;
  
  const searchUrl = new URL("https://api.github.com/search/issues");
  searchUrl.searchParams.append("q", searchQuery);
  searchUrl.searchParams.append("sort", "created");
  searchUrl.searchParams.append("order", "desc");
  searchUrl.searchParams.append("per_page", String(perPage));
  searchUrl.searchParams.append("page", String(page));

  try {
    const ghResponse = await fetch(searchUrl.toString(), {
      headers: {
        Authorization: `Bearer ${req.session.accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!ghResponse.ok) {
      const errorData = await ghResponse.json();
      console.error("GitHub API Error:", errorData);
      return res.status(ghResponse.status).json({ error: "Failed to fetch issues from GitHub" });
    }

    const data = await ghResponse.json();
    
    // Normalize data
    const issues = data.items.map((item: any) => {
      // Extract repo name from repository_url
      // Example: https://api.github.com/repos/facebook/react
      const repoUrlParts = item.repository_url.split("/");
      const repoName = repoUrlParts.slice(-2).join("/");

      // GitHub search doesn't return the exact language in the issue item often, 
      // but labels might contain language tags. We will just pass available info.
      return {
        id: item.id,
        title: item.title,
        url: item.html_url,
        repository: repoName,
        repositoryUrl: item.repository_url.replace("api.github.com/repos", "github.com"),
        labels: item.labels.map((l: any) => l.name),
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      };
    });

    res.json({
      totalCount: data.total_count,
      items: issues,
      page,
      hasMore: data.total_count > page * perPage
    });
  } catch (error) {
    console.error("GitHub Search Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

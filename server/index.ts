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

function categorizeIssue(issue: any): string {
  const text = `${issue.title || ""} ${issue.body || ""} ${issue.labels ? issue.labels.map((l:any)=>l.name).join(" ") : ""}`.toLowerCase();
  
  if (/\b(bug|fix|error|crash)\b/.test(text) || (issue.labels && issue.labels.some((l:any) => l.name.toLowerCase().includes('bug')))) return 'Bug Fix';
  if (/\b(docs?|documentation|readme|typo)\b/.test(text) || (issue.labels && issue.labels.some((l:any) => l.name.toLowerCase().includes('doc')))) return 'Documentation';
  if (/\b(test|testing|jest|cypress|mocha|vitest|playwright)\b/.test(text)) return 'Testing';
  if (/\b(docker|kubernetes|k8s|ci\/cd|actions|workflow|deploy|devops)\b/.test(text)) return 'DevOps';
  if (/\b(sql|postgres|mysql|mongodb|redis|database|db|prisma|orm)\b/.test(text)) return 'Database';
  if (/\b(frontend|ui|ux|react|vue|angular|svelte|css|html|tailwind|component)\b/.test(text) || (issue.labels && issue.labels.some((l:any) => l.name.toLowerCase().includes('frontend')))) return 'Frontend';
  if (/\b(backend|api|server|express|django|flask|spring|node|rest|graphql)\b/.test(text) || (issue.labels && issue.labels.some((l:any) => l.name.toLowerCase().includes('backend')))) return 'Backend';
  
  return 'Other';
}

// Get GitHub Issues
app.get("/api/issues", async (req, res) => {
  if (!req.session.userId || !req.session.accessToken) {
    return res.status(401).json({ error: "Unauthorized or missing GitHub token" });
  }

  const query = req.query.q ? String(req.query.q) : "";
  const page = req.query.page ? parseInt(String(req.query.page)) : 1;
  const language = req.query.language ? String(req.query.language) : "";
  const category = req.query.category ? String(req.query.category) : "";
  const issueLabel = req.query.label ? String(req.query.label) : "";
  const perPage = 20;

  // Construct GitHub Search Query
  let searchTerms = ["is:issue", "is:open", "no:assignee"];
  
  if (issueLabel) {
    searchTerms.push(`label:"${issueLabel}"`);
  } else {
    searchTerms.push('(label:"good first issue" OR label:"help wanted")');
  }

  if (language) {
    searchTerms.push(`language:"${language}"`);
  }

  // Map category to GitHub search terms if provided
  if (category) {
    const cat = category.toLowerCase();
    if (cat === 'frontend') searchTerms.push('(react OR vue OR angular OR svelte OR css OR html OR ui OR frontend)');
    else if (cat === 'backend') searchTerms.push('(api OR server OR express OR django OR flask OR spring OR node OR backend)');
    else if (cat === 'database') searchTerms.push('(sql OR postgres OR mysql OR mongodb OR redis OR database)');
    else if (cat === 'devops') searchTerms.push('(docker OR kubernetes OR actions OR deploy OR devops)');
    else if (cat === 'testing') searchTerms.push('(test OR jest OR cypress OR mocha OR vitest OR playwright)');
    else if (cat === 'documentation') searchTerms.push('(docs OR documentation OR readme)');
    else if (cat === 'bug fix') searchTerms.push('(bug OR fix OR error)');
  }

  if (query) {
    searchTerms.push(query);
  }

  const searchQuery = searchTerms.join(" ");
  
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
    
    // Normalize and categorize data
    const issues = data.items.map((item: any) => {
      const repoUrlParts = item.repository_url.split("/");
      const repoName = repoUrlParts.slice(-2).join("/");
      
      const detectedCategory = categorizeIssue(item);

      return {
        id: item.id,
        title: item.title,
        url: item.html_url,
        repository: repoName,
        repositoryUrl: item.repository_url.replace("api.github.com/repos", "github.com"),
        labels: item.labels.map((l: any) => l.name),
        category: detectedCategory,
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

// Workspace Endpoints

// Save Issue
app.post("/api/workspace", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: "Unauthorized" });
  
  const { githubIssueId, title, url, repository, labels, category, language } = req.body;
  
  try {
    const card = await prisma.workspaceCard.create({
      data: {
        githubIssueId: Number(githubIssueId),
        title,
        url,
        repository,
        labels,
        category,
        language,
        userId: req.session.userId,
      }
    });
    res.json(card);
  } catch(e: any) {
    if (e.code === 'P2002') {
      return res.status(409).json({ error: "Issue already saved" });
    }
    console.error("Save issue error:", e);
    res.status(500).json({ error: "Failed to save issue" });
  }
});

// Sync PR Status
app.post("/api/workspace/sync", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const user = await prisma.user.findUnique({ where: { id: req.session.userId } });
    if (!user) return res.status(404).json({ error: "User not found" });

    if (!req.session.accessToken) {
      return res.status(401).json({ error: "No GitHub token" });
    }

    const cards = await prisma.workspaceCard.findMany({ where: { userId: user.id } });
    let updatedCount = 0;

    for (const card of cards) {
      const q = encodeURIComponent(`is:pr author:${user.username} repo:${card.repository} ${card.githubIssueId}`);
      const searchUrl = `https://api.github.com/search/issues?q=${q}`;
      
      const ghRes = await fetch(searchUrl, {
        headers: {
          Authorization: `token ${req.session.accessToken}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "ContribHQ"
        }
      });

      if (!ghRes.ok) {
        console.error("GitHub API Error syncing PR:", await ghRes.text());
        continue;
      }

      const data = await ghRes.json();
      const prs = data.items || [];
      
      let prNumber = null;
      let prUrl = null;
      let prState = null;
      let newStatus = card.status;

      if (prs.length > 0) {
        const pr = prs[0]; 
        prNumber = pr.number;
        prUrl = pr.pull_request?.html_url || pr.html_url;
        prState = pr.pull_request?.merged_at ? "merged" : pr.state; 
        
        if (prState === "merged") newStatus = "MERGED";
        else if (prState === "open") newStatus = "REVIEW";
        else if (prState === "closed") newStatus = "IN_PROGRESS";
      } else {
        if (card.status === "REVIEW" || card.status === "MERGED") {
          newStatus = "IN_PROGRESS";
        }
      }

      await prisma.workspaceCard.update({
        where: { id: card.id },
        data: {
          prNumber,
          prUrl,
          prState,
          status: newStatus
        }
      });
      updatedCount++;
    }

    res.json({ success: true, count: updatedCount });
  } catch (err) {
    console.error("Sync error:", err);
    res.status(500).json({ error: "Failed to sync PR status" });
  }
});

// List Workspace Issues
app.get("/api/workspace", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: "Unauthorized" });
  
  try {
    const cards = await prisma.workspaceCard.findMany({ 
      where: { userId: req.session.userId }, 
      orderBy: { updatedAt: "desc" } 
    });
    res.json(cards);
  } catch(e) { 
    res.status(500).json({ error: "Failed to fetch workspace" }); 
  }
});

// Update Status
app.patch("/api/workspace/:id", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: "Unauthorized" });
  
  const { status } = req.body;
  
  try {
    const card = await prisma.workspaceCard.findUnique({ where: { id: req.params.id } });
    if (!card || card.userId !== req.session.userId) return res.status(403).json({ error: "Forbidden" });
    
    const updated = await prisma.workspaceCard.update({ 
      where: { id: req.params.id }, 
      data: { status } 
    });
    res.json(updated);
  } catch(e) { 
    res.status(500).json({ error: "Failed to update status" }); 
  }
});

// Delete Issue
app.delete("/api/workspace/:id", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: "Unauthorized" });
  
  try {
    const card = await prisma.workspaceCard.findUnique({ where: { id: req.params.id } });
    if (!card || card.userId !== req.session.userId) return res.status(403).json({ error: "Forbidden" });
    
    await prisma.workspaceCard.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch(e) { 
    res.status(500).json({ error: "Failed to delete" }); 
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

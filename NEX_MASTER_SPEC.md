# NEX MASTER SPEC
AI Music Battle & Ranking Platform

This document defines the complete platform structure for NEX.
Replit Agent must follow this specification when modifying or extending the project.

------------------------------------------------------------

# 1. PLATFORM OVERVIEW

NEX is an AI Music Battle and Ranking Platform.

Core idea:

Users submit AI-generated music tracks.
Tracks are played by users.
Tracks compete in battles.
Users vote for the better track.
All activity feeds a global ranking chart.

The system combines:

Music Discovery  
Music Competition  
Community Participation  
Data-driven ranking

------------------------------------------------------------

# 2. CORE PLATFORM SECTIONS

The platform contains the following main sections:

Home  
Music  
Music Video  
Battle  
Rising  
Radio  
Submit Track

Each section must remain accessible from the top navigation bar.

------------------------------------------------------------

# 3. HOME PAGE STRUCTURE

The Home page is a landing page.

Sections must include:

Hero Section  
What is NEX  
How It Works  
Trust and Verification  
Trending Tracks  
Enter the Arena (Battle CTA)

Purpose:

Explain the platform quickly and push users toward listening and battling.

------------------------------------------------------------

# 4. MUSIC CHART

The Music page shows the Top 100 tracks.

Requirements:

Display ranks from 1 to 100 even if empty.
Tracks are ranked by the NEX ranking algorithm.

Each track card must include:

Rank number  
Track title  
Creator name  
Play button  
Vote access  
Play count  
Win rate (optional)

If fewer than 100 tracks exist, empty slots remain visible.

------------------------------------------------------------

# 5. MUSIC VIDEO CHART

The Music Video page shows music videos.

These are normally YouTube links.

Requirements:

Display Top 100 ranking layout similar to Music chart.

Important UI rule:

Videos must keep correct 16:9 aspect ratio.

Do not display videos in square containers.

------------------------------------------------------------

# 6. BATTLE SYSTEM

The Battle system is the core engagement engine.

Process:

Two tracks are selected randomly within the same genre.

Track A plays first.  
Track B plays second.

Users then vote.

After voting:

Display result screen showing percentage split.

Example:

Track A — 62%  
Track B — 38%

Then load next battle.

------------------------------------------------------------

# 7. RISING SECTION

The Rising page highlights promising tracks.

Conditions:

Minimum battles: 5  
Win rate: 60% or higher

Tracks meeting these conditions appear in Rising.

Purpose:

Surface strong tracks early before they reach the Top 100.

------------------------------------------------------------

# 8. RADIO

Radio is a passive listening mode.

Tracks are automatically played in sequence.

Possible modes:

Top Chart  
Rising Tracks  
Genre Mix

The player should continue automatically.

------------------------------------------------------------

# 9. SUBMIT TRACK

Creators submit tracks through a submission form.

Required fields:

Track Title  
Creator Name  
Genre  
Track Link

Future improvements:

Originality confirmation checkbox  
Creator profile link  
Duplicate URL detection

Submitted tracks enter the system and become eligible for battles.

------------------------------------------------------------

# 10. RANKING ALGORITHM

Track ranking is based on three factors:

Votes  
Play Count  
Recent Activity Boost

Conceptual formula:

Ranking Score =
Vote Weight +
Play Count Weight +
Recent Boost

Votes have the strongest impact.

Recent Boost prevents old tracks from dominating permanently.

------------------------------------------------------------

# 11. DATA FLOW

Platform activity generates ranking data.

User actions:

Play track  
Vote in battle  
Submit track

These actions update:

Track statistics  
Battle history  
Chart ranking

------------------------------------------------------------

# 12. DEVELOPMENT RULES

When modifying the system:

Never break UI flow between sections.

Always keep database schema consistent with frontend data.

Battle logic must remain fair and genre-matched.

Charts must always show 1–100 ranking slots.

Do not implement temporary patches.

Refactor code when needed.

------------------------------------------------------------

# 13. PLATFORM GOAL

NEX aims to become a trusted AI music ranking platform.

Similar credibility model to Billboard charts.

Key values:

Transparency  
Participation  
Discovery  
Competition

The Battle system feeds engagement.

The Chart represents authority.

------------------------------------------------------------

END OF SPEC
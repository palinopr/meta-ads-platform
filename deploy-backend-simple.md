# Simple Backend Deployment Options

Since automated deployments are having issues, here are manual options:

## Option 1: Deploy to Replit (Easiest)

1. Go to https://replit.com
2. Create new Repl → Import from GitHub
3. URL: `https://github.com/palinopr/meta-ads-platform`
4. After import, in the Shell:
   ```bash
   cd backend
   pip install -r requirements.txt
   python run.py
   ```
5. Replit will give you a URL automatically

## Option 2: Deploy to Glitch

1. Go to https://glitch.com
2. New Project → Import from GitHub
3. Use: `palinopr/meta-ads-platform`
4. Edit `.env` file with your variables
5. Edit `package.json`:
   ```json
   {
     "scripts": {
       "start": "cd backend && pip install -r requirements.txt && python run.py"
     }
   }
   ```

## Option 3: Deploy to Deta Space (Free)

1. Install Deta CLI: `curl -fsSL https://get.deta.sh | sh`
2. In backend directory:
   ```bash
   space new
   space push
   ```

## Option 4: Use a VPS (DigitalOcean, Linode, etc.)

1. Create Ubuntu VPS
2. SSH in and run:
   ```bash
   git clone https://github.com/palinopr/meta-ads-platform
   cd meta-ads-platform/backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   
   # Create systemd service
   sudo nano /etc/systemd/system/metaads.service
   ```
   
   Add:
   ```ini
   [Unit]
   Description=Meta Ads Backend
   After=network.target
   
   [Service]
   Type=simple
   User=ubuntu
   WorkingDirectory=/home/ubuntu/meta-ads-platform/backend
   Environment="PATH=/home/ubuntu/meta-ads-platform/backend/venv/bin"
   ExecStart=/home/ubuntu/meta-ads-platform/backend/venv/bin/python run.py
   Restart=on-failure
   
   [Install]
   WantedBy=multi-user.target
   ```
   
   Then:
   ```bash
   sudo systemctl enable metaads
   sudo systemctl start metaads
   ```

## Option 5: Use Supabase Edge Functions (Since you already have Supabase)

Create edge functions for your API endpoints directly in Supabase.

## Environment Variables for All Options

```env
DATABASE_URL=postgresql://postgres.igeuyfuxezvvenxjfnnn:Ai7v+%~%vDN.n"mD@aws-0-us-east-1.pooler.supabase.com:5432/postgres
META_APP_ID=1349075236218599
META_APP_SECRET=7c301f1ac1404565f26462e3c734194c
JWT_SECRET=ihtuAm6HBAOonQeYkO+FvjY8cxCABLSodMMUB8EqryI=
FRONTEND_URL=https://frontend-ten-eta-42.vercel.app
SUPABASE_URL=https://igeuyfuxezvvenxjfnnn.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnZXV5ZnV4ZXp2dmVueGpmbm5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg0NjU1MjcsImV4cCI6MjA1NDA0MTUyN30.gVEXqUA5x_pLU0a2kKlTQFPsYsV8s0P8S2BzCRsZgw0
```

## Testing Your Deployment

Once deployed, test with:
```bash
curl https://your-backend-url/health
```

Should return:
```json
{"status":"healthy","version":"0.1.0"}
```
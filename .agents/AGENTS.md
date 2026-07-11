# Deployment Guidelines

## Docker Swarm Deployment Workflow
When the USER asks to deploy or update the server (or after pushing code that needs to be deployed), you **MUST STRICTLY** follow this sequence:
1. Push your code to GitHub (`git add . && git commit -m "..." && git push`).
2. Wait for exactly **3 minutes** to allow the CI/CD pipeline or Docker Hub to finish building the new image. Use the `schedule` tool or just wait in the conversation for the user to confirm 4 minutes have passed.
3. Only AFTER 4 minutes have passed, connect to the server and run the update command: `ssh root@64.226.118.40 "docker service update --force furniture-xhl2yk"`
4. DO NOT run the `docker service update` command immediately after pushing. If you do, the server will pull the old image and the user's changes will not be reflected, forcing them to do it manually later.

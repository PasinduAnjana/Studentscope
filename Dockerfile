FROM node:20-alpine
WORKDIR /app

# Install dependencies first
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --only=production

# Copy the rest of the code
COPY backend/ ./backend/
COPY frontend/ ./frontend/

EXPOSE 3000
WORKDIR /app/backend
CMD ["node", "server.js"]
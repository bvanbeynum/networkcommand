# Stage 1: Build stage
FROM node:alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Production stage
FROM node:alpine
WORKDIR /app
COPY package*.json ./
# Install ONLY production dependencies
RUN npm install --omit=dev
# Copy built frontend from builder stage
COPY --from=builder /app/build ./build
# Copy backend code
COPY . .
# Expose port
EXPOSE 9201
# Start the application using the start script
CMD ["npm", "start"]

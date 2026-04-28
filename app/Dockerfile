FROM node:alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the app (excluding what's in .dockerignore)
COPY . .

# Build the React UI
RUN cd ui && npm install && npm run build

# Expose the configured port (default 9201)
EXPOSE 9201

# Start the application
CMD ["node", "index.js"]

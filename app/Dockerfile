FROM node:alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDeps for the build)
RUN npm install

# Copy the rest of the application
COPY . .

# Run the React build
RUN npm run build

# Expose the application port
EXPOSE 9201

# Start the application with auto-reloading
CMD ["npm", "start"]

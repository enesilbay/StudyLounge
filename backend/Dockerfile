# Base image
FROM node:18-alpine AS builder

# Create app directory
WORKDIR /app

# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

# Install app dependencies
RUN npm ci

# Bundle app source
COPY . .

# Build the app
RUN npm run build

# Production image
FROM node:18-alpine

WORKDIR /app

# Copy the bundled code from the build stage to the production image
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Expose the port the app runs on
EXPOSE 3000

# Start the server using the production build
CMD [ "npm", "run", "start:prod" ]

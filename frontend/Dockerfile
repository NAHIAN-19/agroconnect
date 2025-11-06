# Node.js base image
FROM node:18

# Set work directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy project
COPY . .

# Expose port and start app
EXPOSE 3000
CMD ["npm", "run", "dev"]

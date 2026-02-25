# Use the official Node.js LTS image 
FROM node:22-alpine

# Set working directory
WORKDIR /usr/src/app 

# Copy package files first to install dependencies
COPY package.json ./

# Install dependencies
RUN npm install -f

#Copy env file
COPY .env .env

# Copy the rest of the application
COPY . .

RUN npm run build 

# Run the app
CMD ["npm", "run", "preview"]

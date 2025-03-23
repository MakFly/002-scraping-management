dev:
	@echo "Starting development server..."
	@docker compose up -d

down:
	@echo "Stopping development server..."
	@docker compose down --volumes --remove-orphans

prisma:
	@echo "Generating Prisma client..."
	@npx prisma generate

db-push:
	@echo "Pushing Prisma schema to database..."
	@pnpm prisma db push
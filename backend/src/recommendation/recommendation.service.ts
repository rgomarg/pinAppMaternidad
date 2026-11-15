import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RecommendationService {
    constructor(private readonly prisma: PrismaService) {}

    async findBooks(month: number, year: number) {
        return await this.prisma.book.findMany({
            where: { 
                month: month, 
                year: year 
            }, 
            select: {
                id: true,
                title: true,
                authors: true,
                synopsis: true,
                imageUrl: true, 
            }
        });
    }

    async findArticles() {
        const articles = await this.prisma.article.findMany({
            orderBy: { id: 'asc' },
            select: {
                id: true,
                title: true,
                description: true,
                url: true,
                source: true,
            }
        });
        if (!articles.length) return [];
        const dayIndex = Math.floor(Date.now() / 86400000); // 86400000 ms = 1 día
        const start = (dayIndex * 2) % articles.length;
        // Rota circularmente sin necesidad de re-consultar la BD
        return Array.from({ length: Math.min(2, articles.length) }, (_, i) => 
            articles[(start + i) % articles.length]
        );
    }

    async findRecipes(childAge: number) {
        const recipes = await this.prisma.recipe.findMany({
            where: {
                ageFor: childAge
            },
            select: {
                id: true,
                name: true,
                time: true,
                difficulty: true,
                servings: true,
                imageUrl: true,
                ingredients: true,
                steps: true,
                ageFor: true
            }
        });
        const dayIndex = Math.floor(Date.now() / 86400000);
        const start = (dayIndex * 2) % recipes.length;
        return Array.from({ length: Math.min(2, recipes.length) }, (_, i) => 
            recipes[(start + i) % recipes.length]
        );
    }
}

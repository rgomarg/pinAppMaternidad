import { Controller, Get, Query } from '@nestjs/common';
import { RecommendationService } from './recommendation.service';

@Controller('recommendation')
export class RecommendationController {
    constructor(private readonly recommendationService: RecommendationService) {}

    @Get('books')
    async findBooks(
        @Query('month') month: number,
        @Query('year') year: number,
    ) {
        return await this.recommendationService.findBooks(month, year);
    }

    @Get('articles')
    findArticles() {
        return this.recommendationService.findArticles();
    }

    @Get('recipes')
    async findRecipes(@Query('childAge') childAge: number) {
        return this.recommendationService.findRecipes(childAge);
    }
}

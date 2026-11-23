import { Controller, Get, Query, ParseIntPipe, Param } from '@nestjs/common';
import { RecommendationService } from './recommendation.service';

@Controller('recommendation')
export class RecommendationController {
    constructor(private readonly recommendationService: RecommendationService) {}

    @Get('books')
    async findBooks(
        @Query('month') month?: string,
        @Query('year') year?: string,
    ) {
        const parsedMonth = month ? parseInt(month, 10) : undefined;
        const parsedYear = year ? parseInt(year, 10) : undefined;
        return await this.recommendationService.findBooks(parsedMonth, parsedYear);
    }

    @Get('books/:month/:year')
    async findBooksByParam(
        @Param('month', ParseIntPipe) month: number,
        @Param('year', ParseIntPipe) year: number,
    ) {
        return await this.recommendationService.findBooks(month, year);
    }

    @Get('articles')
    async findArticles() {
        return await this.recommendationService.findArticles();
    }

    @Get('recipes')
    async findRecipes(@Query('childAge') childAge: number) {
        return await this.recommendationService.findRecipes(childAge);
    }
}

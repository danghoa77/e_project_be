import { IsOptional, IsString, IsNumber, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class ProductQueryDto {
  @IsOptional()
  @IsString({ message: 'Search term must be a string.' })
  search?: string;
  
  @IsOptional()
  @IsString({ message: 'Category must be a string.' })
  category?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Minimum price must be a number.' })
  @Min(0, { message: 'Minimum price cannot be negative.' })
  priceMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Maximum price must be a number.' })
  @Min(0, { message: 'Maximum price cannot be negative.' })
  priceMax?: number;

  @IsOptional()
  @IsString({ message: 'Size must be a string.' })
  size?: string;

  @IsOptional()
  @IsString({ message: 'Color must be a string.' })
  color?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Limit must be a number.' })
  @Min(1, { message: 'Limit must be greater than 0.' })
  limit?: number = 10;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Page must be a number.' })
  @Min(1, { message: 'Page must be greater than 0.' })
  page?: number = 1;

  @IsOptional()
  @IsString({ message: 'Sort by must be a string.' })
  @IsIn(
    ['price', '-price', 'createdAt', '-createdAt'],
    { message: 'Invalid sort value.' }
  )
  sortBy?: string = 'createdAt';
}

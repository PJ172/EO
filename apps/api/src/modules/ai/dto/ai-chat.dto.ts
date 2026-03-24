import { IsString, IsNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ChatMessageDto {
  @IsString()
  @IsNotEmpty()
  role: 'user' | 'assistant' | 'system';

  @IsString()
  @IsNotEmpty()
  content: string;
}

export class AIChatDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages: ChatMessageDto[];
}

export class AIDraftDto {
  @IsString()
  @IsNotEmpty()
  prompt: string;
}

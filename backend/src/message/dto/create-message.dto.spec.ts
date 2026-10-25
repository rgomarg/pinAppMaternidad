import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateMessageDto } from './create-message.dto';

const errorsFor = async (body: object) =>
  (await validate(plainToInstance(CreateMessageDto, body))).map(
    (e) => e.property,
  );

describe('CreateMessageDto', () => {
  const valid = { content: 'Gracias', authorId: 1, threadId: 1 };

  it('acepta una respuesta con texto', async () => {
    expect(await errorsFor(valid)).toEqual([]);
  });

  it('rechaza una respuesta vacía o solo con espacios y saltos de línea', async () => {
    expect(await errorsFor({ ...valid, content: '' })).toEqual(['content']);
    expect(await errorsFor({ ...valid, content: '   \n\n ' })).toEqual([
      'content',
    ]);
  });
});

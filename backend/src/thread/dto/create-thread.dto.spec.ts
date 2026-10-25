import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateThreadDto } from './create-thread.dto';

const errorsFor = async (body: object) =>
  (await validate(plainToInstance(CreateThreadDto, body))).map(
    (e) => e.property,
  );

describe('CreateThreadDto', () => {
  const valid = {
    title: 'Cólicos',
    content: '¿Alguna idea?',
    ownerId: 1,
    tagIds: [1],
  };

  it('acepta un hilo con título, mensaje y una etiqueta', async () => {
    expect(await errorsFor(valid)).toEqual([]);
  });

  it('rechaza título y mensaje vacíos o solo con espacios', async () => {
    expect(await errorsFor({ ...valid, title: '', content: '  \n ' })).toEqual([
      'title',
      'content',
    ]);
  });

  it('exige al menos una etiqueta', async () => {
    expect(await errorsFor({ ...valid, tagIds: [] })).toEqual(['tagIds']);
    expect(await errorsFor({ ...valid, tagIds: undefined })).toEqual([
      'tagIds',
    ]);
  });
});

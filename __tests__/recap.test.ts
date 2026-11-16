import { parseRecap } from '../src/domain/recap';

describe('parseRecap', () => {
  it('parses JSON wrapped in a markdown fence', () => {
    const recap = parseRecap('```json\n{"corrections":[{"original":"Yo gusto café","improved":"Me gusta el café","explanation":"Use me gusta for this construction."}],"phrases":[{"phrase":"Para llevar, por favor.","translation":"To go, please."}],"positiveNote":"You asked clearly."}\n```');
    expect(recap?.corrections).toHaveLength(1);
    expect(recap?.phrases[0]?.translation).toBe('To go, please.');
    expect(recap?.positiveNote).toBe('You asked clearly.');
  });

  it('drops malformed entries and caps model output to a small recap', () => {
    const recap = parseRecap({
      corrections: [
        { original: 'a', improved: 'b', explanation: 'c' },
        { original: 'd', improved: 'e', explanation: 'f' },
        { original: 'g', improved: 'h', explanation: 'i' },
        { original: 'j', improved: 'k', explanation: 'l' },
        { original: '', improved: '', explanation: '' },
      ],
      phrases: Array.from({ length: 6 }, (_, i) => ({ phrase: `Phrase ${i}`, translation: `Meaning ${i}` })),
      positiveNote: '',
    });
    expect(recap?.corrections).toHaveLength(3);
    expect(recap?.phrases).toHaveLength(4);
    expect(recap?.positiveNote).toMatch(/showed up/i);
  });

  it('returns null when the response is not usable JSON or recap content', () => {
    expect(parseRecap('not JSON')).toBeNull();
    expect(parseRecap({ corrections: [], phrases: [] })).toBeNull();
  });
});

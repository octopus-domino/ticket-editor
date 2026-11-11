import {afterEach,describe,it,expect} from 'vitest';
import {LANGUAGES,setLocale,t} from '../../src/shared/i18n';
afterEach(()=>setLocale('ru'));
describe('journey interface localization',()=>{
 it('keeps Russian field label capitalization independently from heading aliases',()=>{
  setLocale('ru');expect(t('Ваша компания')).toBe('Ваша компания');
 });
 it('translates address and numeric validation in every supported locale',()=>{
  for(const [locale]of LANGUAGES){
   setLocale(locale);
   expect(t('This address is already taken. Choose another.')).not.toContain('{');
   if(locale!=='en')expect(t('This address is already taken. Choose another.')).not.toBe('This address is already taken. Choose another.');
   if(locale!=='ru')expect(t('Количество должно быть больше нуля')).not.toMatch(/[А-Яа-я]/);
   expect(t('Позиция {0}: {1}.',200,'price')).toContain('200');
   expect(t('Позиция {0}: {1}.',200,'price')).not.toMatch(/\{\d+\}/);
  }
 });
});

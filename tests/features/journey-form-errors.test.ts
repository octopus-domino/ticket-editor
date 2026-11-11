import {afterEach,it,expect,vi} from 'vitest';
import type {SyntheticEvent} from 'react';
import {setLocale} from '../../src/shared/i18n';
import {publicFetch} from '../../src/features/journeys/api/publicFetch';
import {localizeInvalidField,clearFieldValidation} from '../../src/features/journeys/ui/formValidation';
afterEach(()=>{setLocale('ru');vi.unstubAllGlobals();});
it('uses the chosen language for native required-field feedback and clears it after input',()=>{
 setLocale('de');const field=document.createElement('input');field.required=true;
 const event={target:field} as unknown as SyntheticEvent;
 localizeInvalidField(event);expect(field.validationMessage).toBe('Füllen Sie dieses Feld aus.');
 field.value='Anna';clearFieldValidation(event);expect(field.checkValidity()).toBe(true);
});
it('localizes a public-form network failure instead of exposing the browser English exception',async()=>{
 setLocale('fr');vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
 await expect(publicFetch('/api/public/workflows/test')).rejects.not.toThrow('Failed to fetch');
});

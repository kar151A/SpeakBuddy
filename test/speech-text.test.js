import test from 'node:test';
import assert from 'node:assert/strict';
import { speechText } from '../public/speech-text.js';
test('speech renders opening reactions as delivery and preserves lesson content',()=>{
  assert.equal(speechText('Mm, mm, that sounds tough.',true),'[thoughtful] that sounds tough.');
  assert.equal(speechText('Aaa… I see.'),'I see.');
  assert.equal(speechText('Say “mm”. It measures 5 mm.'),'Say “mm”. It measures 5 mm.');
});

import { describe, expect, it } from 'vitest';
import { LEGEND_ITEMS, shadeForNumber } from '../../../shared/types';
import { encliticStyle } from './encliticStyle';

const contrast = (a:string,b:string) => {
  const luminance = (hex:string) => [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255)
    .map(c=>c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4)
    .reduce((sum,c,i)=>sum+c*[0.2126,0.7152,0.0722][i],0);
  const [high,low]=[luminance(a),luminance(b)].sort((x,y)=>y-x);
  return (high+0.05)/(low+0.05);
};

describe('stile leggibile delle enclitiche nella sola UI',()=>{
  const chips=LEGEND_ITEMS.flatMap(item=>item.numero
    ? [item.color,shadeForNumber(item.color,'singolare'),shadeForNumber(item.color,'plurale')]
    : [item.color]);
  chips.push('#000000','#ffffff','#757575');
  for(const chip of chips){
    it(`contrasto e contorno con chip ${chip}`,()=>{
      for(const base of ['#2e2018','#fff7ec','#FFFFFF']){
        const style=encliticStyle(chip,base);
        expect(style.borderColor).toBe(chip);
        expect(contrast(style.color,style.backgroundColor)).toBeGreaterThanOrEqual(4.5);
        expect(['#ffffff','#1a1a1a']).toContain(style.color);
      }
    });
  }
  it('inverte bianco/nero rispetto alla base anche per parole sconosciute',()=>{
    expect(encliticStyle('#FFC742','#2e2018')).toEqual({color:'#ffffff',backgroundColor:'#1a1a1a',borderColor:'#FFC742'});
    expect(encliticStyle('#000000','#FFFFFF')).toEqual({color:'#1a1a1a',backgroundColor:'#ffffff',borderColor:'#000000'});
    expect(encliticStyle('#4A4A4A','#fff7ec')).toEqual({color:'#1a1a1a',backgroundColor:'#ffffff',borderColor:'#4A4A4A'});
  });
});


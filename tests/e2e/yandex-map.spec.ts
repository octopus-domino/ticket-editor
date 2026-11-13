import { test,expect } from '@playwright/test';

for(const width of [390,1440])test(`Yandex alternative uses only the JavaScript map SDK at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});
  await page.addInitScript(()=>localStorage.setItem('codoc:language','ru'));
  await page.route('**/api/**',route=>{
    const path=new URL(route.request().url()).pathname;
    if(!path.startsWith('/api/'))return route.continue();
    if(path==='/api/journeys/maps/providers')return route.fulfill({json:{yandexEnabled:true,yandexBrowserKey:'public-fixture-map-key'}});
    return route.fulfill({status:401,json:{error:'Unauthorized'}});
  });
  await page.route('https://tiles.openfreemap.org/**',route=>route.fulfill({json:{version:8,sources:{},layers:[]}}));
  await page.route('https://api-maps.yandex.ru/**',route=>route.fulfill({contentType:'application/javascript',body:`
    window.ymaps={ready:callback=>callback(),Map:class {
      constructor(id,state){if(state.controls.includes('searchControl'))throw Error('Paid search must not be enabled');document.getElementById(id).textContent='JavaScript map ready';}
      events={add:()=>{}};geoObjects={removeAll:()=>document.querySelectorAll('[data-marker]').forEach(node=>node.remove()),add:object=>{if(object.button)document.getElementById('map').append(object.button)}};setCenter(){};setBounds(){};getCenter(){return [55.75,37.62]};destroy(){}
    },Placemark:class {constructor(coordinates,properties){this.button=document.createElement('button');this.button.dataset.marker='true';this.button.textContent=properties.hintContent;this.button.dataset.coordinates=coordinates.join(',');}events={add:(name,callback)=>{if(name==='click')this.button.onclick=callback}}},Polyline:class {events={add:()=>{}}}};
  `}));
  await page.goto('/start/tours');
  await page.locator('.route-map-picker .route-yandex-map select').selectOption('yandex');
  const frame=page.frameLocator('.route-map-picker iframe');
  await expect(frame.locator('#map')).toHaveText('JavaScript map ready');
  await page.evaluate(()=>{
    const iframe=document.querySelector<HTMLIFrameElement>('.route-map-picker iframe')!;
    const channel=new URL(iframe.src).searchParams.get('channel');
    window.addEventListener('message',event=>{
      if(event.source===iframe.contentWindow&&event.origin===location.origin&&event.data?.channel===channel&&event.data.type==='select')
        document.body.dataset.selectedMapPoint=event.data.data.id;
    });
    iframe.contentWindow!.postMessage({channel,type:'scene',data:{center:[37.62,55.75],points:[{id:'courtyard',label:'Quiet courtyard',longitude:37.62,latitude:55.75}],stops:[],legs:[]}},location.origin);
  });
  await expect(frame.getByRole('button',{name:'Quiet courtyard'})).toHaveAttribute('data-coordinates','55.75,37.62');
  await frame.getByRole('button',{name:'Quiet courtyard'}).click();
  await expect(page.locator('body')).toHaveAttribute('data-selected-map-point','courtyard');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('.route-map-picker .route-yandex-map select').selectOption('current');
  await expect(page.locator('.route-map-picker iframe')).toHaveCount(0);
  await page.locator('.language-switcher select').first().selectOption('en');
  await expect(page.locator('.route-map-picker .route-yandex-map')).toHaveCount(0);
});

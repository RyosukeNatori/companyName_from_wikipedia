import { JSDOM } from 'jsdom';
import { writeFileSync } from 'fs';

const { document } = new JSDOM(
  await (
    await fetch(
      'https://ja.wikipedia.org/wiki/%E4%B8%8A%E5%A0%B4%E4%BC%81%E6%A5%AD%E4%B8%80%E8%A6%A7'
    )
  ).text()
).window;

const stockMarketUrls = [
  ...document.querySelectorAll(
    '#mw-content-text > div.mw-parser-output > ul:nth-child(5) > li> a'
  ),
].map(({ href }) => {
  return new URL(href, 'https://ja.wikipedia.org').href;
});

const urls = (
  await Promise.all(
    stockMarketUrls.map(async (stockMarketUrl) => {
      const { document } = new JSDOM(await (await fetch(stockMarketUrl)).text())
        .window;
      return [
        ...document.querySelectorAll(
          '#mw-content-text > div.mw-parser-output > table > tbody > tr > td:nth-child(2)> a'
        ),
      ]
        .filter(({ href }) => href.startsWith('/wiki'))
        .map(({ href }) => {
          return new URL(href, 'https://ja.wikipedia.org').href;
        });
    })
  )
).flat();

const len = 20;
const splittedUrls = urls.reduce(
  (a, v, i) => (i % len ? a : [...a, urls.slice(i, i + len)]),
  []
);

const companyNames = [];
let i = 0;
for (let i = 0; i < splittedUrls.length; i++) {
  // for (const urls of splittedUrls) {
  console.log(`${(i / splittedUrls.length) * 100}%`);
  companyNames.push(
    ...(
      await Promise.all(
        splittedUrls[i].map(async (url) => {
          const { document } = new JSDOM(
            await (
              await fetch(url).catch(() => {
                console.log(url);
                process.exit(1);
              })
            ).text()
          ).window;
          const enName =
            document.querySelector(
              '#mw-content-text > div.mw-parser-output > table.infobox.plainlist > caption > span'
            )?.textContent ?? '';
          const escapeEnName = `"${enName}"`;
          const jaNames = document
            .querySelector(
              '#mw-content-text > div.mw-parser-output > table.infobox.plainlist > caption'
            )
            ?.textContent.replace(enName, '');
          const tmpCompanyAliasName =
            document.querySelector('#firstHeading > span')?.textContent ?? '';
          const companyAliasName = `"${tmpCompanyAliasName}"`;
          const companyUrl = document.querySelector(
            '#mw-content-text > div.mw-parser-output > table.infobox.plainlist > tbody > tr > td > span > a.external.free'
          )?.href;

          return [jaNames, companyAliasName, escapeEnName, companyUrl];
        })
      )
    ).filter(
      ([jaNames, companyAliasName, enName, companyUrl]) =>
        companyUrl != undefined
    )
  );
}

const csvString = companyNames.map((list) => list.join()).join('\n');
writeFileSync('companyUrlfromStockMarkets.csv', csvString);

const inquirer = require("inquirer");
const chalk = require("chalk");
const request = require("request");
const fsExtra = require("fs-extra");
const path = require("path");
const postcss = require("postcss");
const prettier = require("prettier");

const inputIconfontCssUrl = async () => {
  console.log(`${chalk.bgBlue.black("Icons")} fetch iconfont to scss`);

  const { value } = await inquirer.prompt([
    {
      type: "input",
      name: "value",
      message: "please input iconfont.css link",
      default: "//at.alicdn.com/t/font_1922968_ofdcsdfws5s.css",
    },
  ]);
  return value;
};

const fetchIconfontCss = async (iconfontCssUrl) => {
  return new Promise((resolve, reject) => {
    request(`https:${iconfontCssUrl.trim()}`, (error, response) => {
      if (error) return reject(error);
      resolve(response.body);
    });
  });
};

const downloadIconFontFiles = (iconfontCssUrl) => {
  const directory = path.resolve(__dirname, "../src/components/icon/src");
  ["eot", "woff", "ttf", "svg"].forEach((fileSuffix) => {
    const iconfontPath = `${directory}/iconfont.${fileSuffix}`;
    const stream = fsExtra.createWriteStream(iconfontPath);
    const uri = `https:${iconfontCssUrl}`.replace(".css", `.${fileSuffix}`);
    request(uri).pipe(stream);
  });
};

const repelceIconFontLocalFile = (iconfontCssUrl, cssContent) => {
  const urlRegex = new RegExp(iconfontCssUrl.replace(".css", ""), "g");
  cssContent = cssContent.replace(urlRegex, "/src/components/icon/src/");
  return prettier.format(cssContent, { parser: "css" });
};

const classToTypeScriptFile = (cssContent) => {
  const postcssContent = postcss.parse(cssContent);
  const classsNameList = Array.from(postcssContent.nodes, (node) => {
    const { selector } = node;
    if (!selector) return;
    if (!/\.v-icon-([^:]+):before/.test(selector)) return;
    const className = selector.replace(/\.|:before/g, "");
    return className;
  }).filter((value) => value);

  const iconType = `export type IconType = '${classsNameList.join("'|'")}';`;
  const iconClassList = `export default ${JSON.stringify(classsNameList)};`;
  const fileContnet = `${iconType} \n ${iconClassList}`;
  const tsContent = prettier.format(fileContnet, { parser: "babel" });
  const directory = path.resolve(__dirname, "../src/components/icon/src");
  fsExtra.outputFile(`${directory}/iconfont.ts`, tsContent);
};

const iconsToScss = async () => {
  const iconfontCssUrl = await inputIconfontCssUrl();
  if (!iconfontCssUrl) return;
  downloadIconFontFiles(iconfontCssUrl);
  const cssContent = await fetchIconfontCss(iconfontCssUrl);
  const css = repelceIconFontLocalFile(iconfontCssUrl, cssContent);
  const directory = path.resolve(__dirname, "../src/components/icon/src");
  fsExtra.outputFile(`${directory}/iconfont.scss`, css);
  classToTypeScriptFile(cssContent);
};

iconsToScss();

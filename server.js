const express = require("express");
const app = express();
const port = process.env.PORT || 5555;

app.get("/", (req, res) => {
  res.sendFile("public/index.html", { root: __dirname });
});

app.use(express.static("public"));
app.use(express.json());

class DomTreeNode {
  constructor(elem, isText = false) {
    this.elem = elem;
    this.children = [];
    this.parent = null;
    this.isText = isText;
  }

  addChild(node) {
    node.parent = this;
    this.children.push(node);
    // this.parent = null;
  }

  getNodeElem() {
    return this.elem;
  }
}

function toObject(rootNode, obj = { e: "root" }, index = 0, legend = {}, root) {
  let ptr = rootNode;
  const currObj = (obj["n" + index] = {});
  currObj.e = ptr.elem;
  if (ptr.isText) {
    currObj.x = 1;
  }
  // Should run fist iteration only.
  if (!root && obj.e === "root") {
    // a bit redundant. can remove the whole root concept.
    root = obj;
  }
  // See if value exists already in the legend.
  if (!currObj.x) {
    let foundKey = "";
    let valueFoundInLegend = false;
    for (const key in legend) {
      if (legend[key] === currObj.e) {
        foundKey = key;
        valueFoundInLegend = true;
        break;
      }
    }
    if (valueFoundInLegend) {
      // key already found.
      currObj.e = foundKey;
    } else {
      const newKey = String.fromCharCode(97 + Object.keys(legend).length);
      legend[newKey] = currObj.e;
      currObj.e = newKey;
    }
  }
  // Recursively add children to the object.
  for (let i = 0; i < ptr.children.length; i++) {
    toObject(ptr.children[i], obj["n" + index], i, legend, root);
  }
  if (!root.le) {
    root.le = legend;
  }
  return obj;
}

function buildDOMTree(rawHtml) {
  let domTree;
  let treePtr;
  let elA, elB;
  let nA, nB; // non-element bounds
  for (let i = 0; i < rawHtml.length; i++) {
    // Check for element start.
    if (rawHtml[i] === "<") {
      elA = i;
      if (nA) {
        nB = i;
        const textElem = rawHtml.substring(nA, i);
        const newNode = new DomTreeNode(textElem, true);
        treePtr.addChild(newNode); // create new node but don't point to it.
      }
      nA = null;
    }
    // Check for element end.
    else if ((elA || elA === 0) && rawHtml[i] === ">") {
      elB = i;
      const elem = rawHtml.substring(elA + 1, elB);
      if (!domTree) {
        domTree = new DomTreeNode(elem);
        treePtr = domTree;
      } else if (elem.startsWith("/")) {
        // Closing element. Move pointer up to parent.
        treePtr = treePtr.parent;
      } else if (elem.endsWith("/")) {
        // Self closing: Create element but don't point to its children.
        const newNode = new DomTreeNode(elem);
        treePtr.addChild(newNode);
      } else {
        const newNode = new DomTreeNode(elem);
        treePtr.addChild(newNode);
        treePtr = newNode;
      }
      elA = null;
      elB = null;
    } else if (!elA && elA !== 0 && !nA) {
      // it's not a < or >, nor inside of <>
      nA = i;
    }
  }
  return domTree;
}

// This is the same function returned in the response
// with better variable names, and it returns the string instead
// of writing it to the document.
const parseIt = (encodedStringifiedDomObject) => {
  domObject = JSON.parse(atob(encodedStringifiedDomObject));
  var domString = "",
    legend = domObject.le, // le = legend.
    parseDomObj = (domObj) => {
      var keys = Object.keys(domObj);
      for (var i = 0; i < keys.length; i++) {
        if (keys[i] === "le") continue; // Skip if it's the legend.
        var element = domObj[keys[i]];
        if (element.e) {
          // Element object. Either text, <></> or <selfclosing/>
          if (element.x) {
            domString += element.e; // Text content between elements.
          } else {
            domString += "<" + legend[element.e] + ">";
            parseDomObj(element);
            domString += "</" + legend[element.e] + ">";
          }
        }
      }
    };
  parseDomObj(domObject);
  return domString;
};

app.post("/obfuscate", (req, res) => {
  const rawHtml = req.body.rawHtml;
  const domTree = buildDOMTree(rawHtml);
  const domAsObject = toObject(domTree);
  delete domAsObject.e; // delete the root.
  const stringObj = JSON.stringify(domAsObject);
  console.log("<> JSON: ", stringObj);
  let obfuscatedHtml = "<script>";
  obfuscatedHtml += `var q="${btoa(stringObj)}";`;
  console.log("<> PARSED: ", parseIt(btoa(stringObj)));
  obfuscatedHtml += `q=JSON.parse(atob(q));var d="",l=q.le,m=(t)=>{var k=Object.keys(t);for(var i=0;i<k.length;i++){if(k[i]==="le")continue;var el=t[k[i]];if(el.e){if(el.x){d+=el.e;}else{d+="<"+l[el.e]+">";m(el);d+="</"+l[el.e]+">";}}}};m(q);document.write(d);`;
  obfuscatedHtml =
    obfuscatedHtml +
    "</script><noscript>&#x1f480; JavaScript must be enabled &#x1f480;</noscript>";
  res.send({
    obfuscatedHtml,
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

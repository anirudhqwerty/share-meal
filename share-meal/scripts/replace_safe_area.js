const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) results.push(file);
    }
  });
  return results;
}

const files = walk('c:/Users/aniru/dbms/share-meal/app');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('SafeAreaView')) {
    const regex = /import\s+\{([^}]+)\}\s+from\s+['"]react-native['"];/g;
    let modified = false;
    content = content.replace(regex, (match, p1) => {
      if (p1.includes('SafeAreaView')) {
        modified = true;
        const newP1 = p1.split(',').map(s => s.trim()).filter(s => s !== 'SafeAreaView' && s !== '').join(', ');
        if (newP1.length > 0) {
          return `import { ${newP1} } from 'react-native';\nimport { SafeAreaView } from 'react-native-safe-area-context';`;
        } else {
          return `import { SafeAreaView } from 'react-native-safe-area-context';`;
        }
      }
      return match;
    });
    if (modified) {
      fs.writeFileSync(file, content);
      console.log('Modified ' + file);
    }
  }
});

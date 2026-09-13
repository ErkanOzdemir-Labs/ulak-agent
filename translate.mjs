import { Project, SyntaxKind } from 'ts-morph';
import { translate } from 'bing-translate-api';

const delay = ms => new Promise(res => setTimeout(res, ms));

async function main() {
    console.log("TS-Morph projesi baslatiliyor...");
    const project = new Project();
    const sourceFileTR = project.addSourceFileAtPath('apps/desktop/src/i18n/tr.ts');
    const sourceFileEN = project.addSourceFileAtPath('apps/desktop/src/i18n/en.ts');
    
    const trExport = sourceFileTR.getVariableDeclaration('tr').getInitializerIfKindOrThrow(SyntaxKind.ObjectLiteralExpression);
    const enExport = sourceFileEN.getVariableDeclaration('en').getInitializerIfKindOrThrow(SyntaxKind.ObjectLiteralExpression);

    const stringsToTranslate = []; 

    function visit(trNode, enNode) {
        if (!trNode || !enNode) return;
        
        if (trNode.getKind() === SyntaxKind.PropertyAssignment && enNode.getKind() === SyntaxKind.PropertyAssignment) {
            const trVal = trNode.getInitializer();
            const enVal = enNode.getInitializer();

            if (!trVal || !enVal) return;

            // Only plain string literals — skip templates and arrow functions to avoid ts-morph crashes
            if ((trVal.getKind() === SyntaxKind.StringLiteral || trVal.getKind() === SyntaxKind.NoSubstitutionTemplateLiteral) &&
                (enVal.getKind() === SyntaxKind.StringLiteral || enVal.getKind() === SyntaxKind.NoSubstitutionTemplateLiteral)) {
                const trText = trVal.getLiteralText();
                const enText = enVal.getLiteralText();
                if (trText === enText && trText.trim().length > 1) {
                    stringsToTranslate.push({ node: trVal, original: trText, type: 'literal' });
                }
            } else if (trVal.getKind() === SyntaxKind.ObjectLiteralExpression && enVal.getKind() === SyntaxKind.ObjectLiteralExpression) {
                const trChildren = trVal.getProperties();
                const enChildren = enVal.getProperties();
                for (let k = 0; k < Math.min(trChildren.length, enChildren.length); k++) {
                    visit(trChildren[k], enChildren[k]);
                }
            }
            // Skip ArrowFunction and TemplateExpression to avoid ts-morph tree mismatch crashes
        }
    }

    const trProps = trExport.getProperties();
    const enProps = enExport.getProperties();
    
    for (let k = 0; k < Math.min(trProps.length, enProps.length); k++) {
        visit(trProps[k], enProps[k]);
    }

    console.log(`Cevrilecek kalan metin sayisi: ${stringsToTranslate.length}`);

    const BATCH_SIZE = 12;
    let translated = 0;
    let errors = 0;
    
    for (let i = 0; i < stringsToTranslate.length; i += BATCH_SIZE) {
        const batch = stringsToTranslate.slice(i, i + BATCH_SIZE);
        const originals = batch.map(b => b.original);
        const combinedText = originals.join(' ||| ');

        try {
            console.log(`Cevriliyor... BATCH [${i}/${stringsToTranslate.length}]`);
            
            const res = await translate(combinedText, null, 'tr');
            const translatedCombined = res.translation;
            const translatedArray = translatedCombined.split(/\s*\|\|\|\s*/);
            
            for (let j = 0; j < batch.length; j++) {
                if (j >= translatedArray.length) break;
                let translatedText = translatedArray[j].trim();
                const item = batch[j];

                // Escape quotes properly
                const hasSingle = translatedText.includes("'");
                const hasDouble = translatedText.includes('"');
                if (hasSingle && !hasDouble) {
                    item.node.replaceWithText(`"${translatedText}"`);
                } else if (hasSingle && hasDouble) {
                    item.node.replaceWithText(`\`${translatedText.replace(/`/g, "\\`")}\``);
                } else {
                    item.node.replaceWithText(`'${translatedText}'`);
                }
                translated++;
            }
            
            // Save after each batch
            sourceFileTR.saveSync();
            await delay(2500);
        } catch (e) {
            errors++;
            console.error(`Batch hatasi [${i}]: ${e.message}`);
            if (errors > 20) {
                console.error("Cok fazla hata, durduruluyor.");
                break;
            }
            await delay(5000);
        }
    }

    console.log(`\nToplam cevrilen: ${translated}, Hata: ${errors}`);
    console.log("Ceviri islemi tamamen bitti!");
}

main().catch(console.error);

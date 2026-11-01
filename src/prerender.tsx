// Gera o HTML pronto das páginas públicas na hora do build, para o Google ler o conteúdo.
import {renderToString} from 'react-dom/server';
import {Router} from 'wouter';
import {App} from './App';

export function render(path: string): string {
  return renderToString(
    <Router ssrPath={path}>
      <App />
    </Router>,
  );
}

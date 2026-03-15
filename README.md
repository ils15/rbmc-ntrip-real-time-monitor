# RBMC Monitor

Um monitor em tempo real para as estações da RBMC (Rede Brasileira de Monitoramento Contínuo dos Sistemas GNSS).

O projeto consiste em um dashboard que exibe o status e a localização das estações GNSS através de dados obtidos de um NTRIP Caster.

## 🚀 Funcionalidades

- Visualização de mapa com todas as estações RBMC.
- Lista detalhada das estações (ponto de montagem, sistema de navegação, etc.).
- Atualização em tempo real via proxy Node.js.
- Interface responsiva com design moderno.

## 🛠️ Tecnologias Utilizadas

- **Frontend:** React, Vite, Leaflet (para o mapa), Tailwind CSS/Vanilla CSS.
- **Backend:** Node.js, Express, Axios.
- **Dados:** NTRIP (Networked Transport of RTCM via Internet Protocol).

## 📋 Pré-requisitos

- [Node.js](https://nodejs.org/) (v16 ou superior)
- [npm](https://www.npmjs.com/) ou [yarn](https://yarnpkg.com/)

## 🔧 Instalação e Configuração

1. Clone o repositório:
   ```bash
   git clone https://github.com/seu-usuario/rbmc-monitor.git
   cd rbmc-monitor
   ```

2. Instale as dependências da raiz e do servidor:
   ```bash
   npm install
   ```

3. Instale as dependências do cliente:
   ```bash
   cd client
   npm install
   cd ..
   ```

4. Configure as variáveis de ambiente:
   - Crie um arquivo `.env` na raiz do projeto baseado no `.env.example`.
   - Ajuste os valores conforme seu ambiente.

Variáveis disponíveis:

```env
PORT=3001
NTRIP_CASTER_URL=http://170.84.40.52:2101
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
CACHE_TTL_MS=300000
NODE_ENV=development
```

## 💻 Como Rodar

### Desenvolvimento (recomendado)
- **Backend + frontend juntos (mais simples):**
  ```bash
  npm run dev:all
  ```

- **Ou separado:**
  - Terminal 1 (servidor):
    ```bash
    npm run dev
    ```
  - Terminal 2 (cliente):
    ```bash
    cd client
    npm run dev
    ```

A aplicação estará disponível em `http://localhost:5173`.

## 🧪 Testes

Execute os testes do backend com:

```bash
npm test
```

## 📄 Licença

Este projeto está sob a licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🤝 Contribuições

Contribuições são bem-vindas! Sinta-se à vontade para abrir uma issue ou enviar um pull request.

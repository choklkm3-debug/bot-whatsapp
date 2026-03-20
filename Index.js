const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys')
const fs = require('fs')

// Banco de dados simples
let data = {
  saldo: 0,
  ganhos: 0,
  gastos: 0,
  historico: [],
  tarefas: []
}

// Carregar dados se já existir
if (fs.existsSync('data.json')) {
  data = JSON.parse(fs.readFileSync('data.json'))
}

// Função pra salvar
function salvar() {
  fs.writeFileSync('data.json', JSON.stringify(data, null, 2))
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth')

const sock = makeWASocket({
  auth: state
})

if (!state.creds.registered) {
  console.log("⚡ GERANDO CÓDIGO...")
  const code = await sock.requestPairingCode("5579981570034")
  console.log("📱 Código de pareamento:", code)
}

sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', (update) => {
    const { connection, qr } = update

    if (qr) {
      console.log('📱 Escaneie o QR:')
      console.log(qr)
    }

    if (connection === 'open') {
      console.log('✅ CONECTADO!')
    }

    if (connection === 'close') {
      console.log('❌ DESCONECTADO!')
    }
  })

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message) return

    const texto = msg.message.conversation || msg.message.extendedTextMessage?.text
    const jid = msg.key.remoteJid

    if (!texto) return

    const comando = texto.toLowerCase()

    // MENU
    if (comando === 'menu') {
      return sock.sendMessage(jid, {
        text: `📋 MENU

💰 Financeiro:
- ganhei 50
- gastei 20
- saldo
- relatorio

📌 Tarefas:
- add tarefa estudar
- ver tarefas
- feito 1`
      })
    }

    // GANHOS
    if (comando.startsWith('ganhei')) {
      let valor = parseFloat(comando.split(' ')[1])
      if (isNaN(valor)) return

      data.ganhos += valor
      data.saldo += valor
      data.historico.push(`+${valor}`)
      salvar()

      return sock.sendMessage(jid, {
        text: `💰 Ganho registrado: +${valor}\nSaldo: ${data.saldo}`
      })
    }

    // GASTOS
    if (comando.startsWith('gastei')) {
      let valor = parseFloat(comando.split(' ')[1])
      if (isNaN(valor)) return

      data.gastos += valor
      data.saldo -= valor
      data.historico.push(`-${valor}`)
      salvar()

      return sock.sendMessage(jid, {
        text: `💸 Gasto registrado: -${valor}\nSaldo: ${data.saldo}`
      })
    }

    // SALDO
    if (comando === 'saldo') {
      return sock.sendMessage(jid, {
        text: `💰 SALDO

Ganhos: ${data.ganhos}
Gastos: ${data.gastos}
Atual: ${data.saldo}`
      })
    }

    // RELATÓRIO
    if (comando === 'relatorio') {
      return sock.sendMessage(jid, {
        text: `📊 RELATÓRIO

${data.historico.join('\n')}

Saldo final: ${data.saldo}`
      })
    }

    // ADD TAREFA
    if (comando.startsWith('add tarefa')) {
      let tarefa = comando.replace('add tarefa ', '')
      data.tarefas.push(tarefa)
      salvar()

      return sock.sendMessage(jid, {
        text: `✅ Tarefa adicionada:\n${tarefa}`
      })
    }

    // VER TAREFAS
    if (comando === 'ver tarefas') {
      if (data.tarefas.length === 0) {
        return sock.sendMessage(jid, { text: '📭 Nenhuma tarefa' })
      }

      let lista = data.tarefas.map((t, i) => `${i + 1}. ${t}`).join('\n')

      return sock.sendMessage(jid, {
        text: `📌 TAREFAS:\n${lista}`
      })
    }

    // CONCLUIR TAREFA
    if (comando.startsWith('feito')) {
      let index = parseInt(comando.split(' ')[1]) - 1

      if (isNaN(index) || !data.tarefas[index]) return

      let removida = data.tarefas.splice(index, 1)
      salvar()

      return sock.sendMessage(jid, {
        text: `✔️ Concluído: ${removida}`
      })
    }
  })
}

startBot()

import os
from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 9)
        self.setFillColor(colors.HexColor("#7F8C8D"))
        
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(54, 800, "PixPro — Documento de Design de Arquitetura Baseada em Eventos (EDA)")
            self.setStrokeColor(colors.HexColor("#BDC3C7"))
            self.setLineWidth(0.5)
            self.line(54, 792, 540, 792)

        # Footer
        text = f"Página {self._pageNumber} de {page_count}"
        self.drawRightString(540, 36, text)
        self.drawString(54, 36, "Jala University — Capstone DS5 | Grupo 3 | Issue 5.2")
        self.setStrokeColor(colors.HexColor("#BDC3C7"))
        self.setLineWidth(0.5)
        self.line(54, 48, 540, 48)
        
        self.restoreState()

def create_pdf():
    pdf_path = Path("docs/diagrams/DOCUMENTO-DESIGN-ARQUITETURA-EVENTOS.pdf")
    doc = SimpleDocTemplate(
        str(pdf_path),
        pagesize=A4,
        leftMargin=45,
        rightMargin=45,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#1A5276"),
        spaceAfter=6
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#566573"),
        spaceAfter=15
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=colors.HexColor("#1B4F72"),
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Heading3'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#2C3E50"),
        spaceBefore=10,
        spaceAfter=6,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor("#2C3E50"),
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'Bullet_Custom',
        parent=body_style,
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=4
    )

    code_style = ParagraphStyle(
        'Code_Custom',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8,
        leading=10.5,
        textColor=colors.HexColor("#17202A")
    )

    table_cell = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11.5,
        textColor=colors.HexColor("#2C3E50")
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=table_cell,
        fontName='Helvetica-Bold',
        textColor=colors.HexColor("#1A5276")
    )

    table_header = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11.5,
        textColor=colors.white
    )

    story = []

    # Title & Metadata
    story.append(Paragraph("PixPro — Documento de Design de Arquitetura de Eventos (EDA)", title_style))
    story.append(Paragraph("<b>Projeto Final PixPro — Capstone DS5 | Grupo 3</b><br/>Referência: Issue 5.2 — Arquitetura de Eventos, Diagramas e Documento de Design (Foco: Visualização)", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#1B4F72"), spaceAfter=12))

    # Section 1
    story.append(Paragraph("1. Introdução e Contextualização do Problema", h1_style))
    story.append(Paragraph(
        "O <b>PixPro</b> é uma plataforma inteligente e distribuída para processamento assíncrono de imagens, "
        "projetada para aplicar modelos de Aprendizado de Máquina (Transfer Learning com MobileNet, melhorias artísticas "
        "e detecção de objetos). Em abordagens síncronas tradicionais (onde o cliente aguarda o processamento de IA "
        "com a requisição HTTP aberta), o ecossistema sofre com <i>timeouts</i> severos, alto consumo de memória na porta de "
        "entrada e indisponibilidade em cascata. Para sanar esses gargalos, adotou-se uma <b>Arquitetura Orientada a Eventos (EDA)</b> "
        "baseada em mensageria com <b>RabbitMQ</b>, persistência relacional com <b>PostgreSQL/Sequelize</b> e notificações <b>WebSocket</b>.",
        body_style
    ))

    # Section 2
    story.append(Paragraph("2. Topologia do Barramento de Mensageria (RabbitMQ)", h1_style))
    topologia_data = [
        [Paragraph("Elemento", table_header), Paragraph("Nome", table_header), Paragraph("Tipo", table_header), Paragraph("Papel no Ecossistema", table_header)],
        [Paragraph("Exchange Principal", table_cell_bold), Paragraph("<code>pixpro.events</code>", table_cell), Paragraph("topic (durable)", table_cell), Paragraph("Barramento central de distribuição de eventos de domínio da aplicação.", table_cell)],
        [Paragraph("Fila Principal", table_cell_bold), Paragraph("<code>image-queue</code>", table_cell), Paragraph("classic (durable)", table_cell), Paragraph("Fila durável onde tarefas de <code>ImageUploaded</code> aguardam consumo por Workers.", table_cell)],
        [Paragraph("Fila de Retry", table_cell_bold), Paragraph("<code>image.retry.delay</code>", table_cell), Paragraph("classic (TTL)", table_cell), Paragraph("Retenção temporizada para cálculo de backoff exponencial em falhas transitórias.", table_cell)],
        [Paragraph("Dead Letter Exchange", table_cell_bold), Paragraph("<code>pixpro.dlx</code>", table_cell), Paragraph("direct (durable)", table_cell), Paragraph("Roteador exclusivo para isolar mensagens rejeitadas definitivamente.", table_cell)],
        [Paragraph("Dead Letter Queue", table_cell_bold), Paragraph("<code>image.processing.dlq</code>", table_cell), Paragraph("classic (durable)", table_cell), Paragraph("Fila morta para auditoria, inspeção e recuperação administrativa via Replay.", table_cell)],
    ]
    t = Table(topologia_data, colWidths=[105, 110, 85, 195])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#1A5276")),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#BDC3C7")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#F8F9F9")]),
    ]))
    story.append(t)
    story.append(Spacer(1, 10))

    # Section 3
    story.append(Paragraph("3. Especificação dos Contratos de Eventos (ADR-005)", h1_style))
    story.append(Paragraph("A comunicação assíncrona é padronizada através dos seguintes contratos em formato JSON:", body_style))
    
    events_code = (
        "// A. Evento: ImageUploaded (Disparado pelo Produtor)\n"
        "{\n"
        '  "eventId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",\n'
        '  "eventType": "ImageUploaded",\n'
        '  "timestamp": "2026-11-01T15:00:00.000Z",\n'
        '  "data": {\n'
        '    "imageId": "img_1792624271045_50f91595",\n'
        '    "userId": "usr_123456789",\n'
        '    "filePath": "/storage/raw/usr_123456789/img_987.jpg",\n'
        '    "originalName": "foto_perfil.jpg",\n'
        '    "mimeType": "image/jpeg"\n'
        "  }\n"
        "}\n\n"
        "// B. Evento: ImageProcessed (Disparado pelo Worker em Sucesso)\n"
        "{\n"
        '  "eventId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",\n'
        '  "eventType": "ImageProcessed",\n'
        '  "timestamp": "2026-11-01T15:00:06.432Z",\n'
        '  "data": {\n'
        '    "imageId": "img_1792624271045_50f91595",\n'
        '    "userId": "usr_123456789",\n'
        '    "processedFilePath": "/storage/processed/usr_123456789/img_987_out.jpg",\n'
        '    "aiMetadata": { "model": "MobileNet-v1", "confidence": 0.965, "tags": ["portrait"] }\n'
        "  }\n"
        "}\n\n"
        "// C. Evento: ProcessingError (Disparado em Falha Irreversível)\n"
        "{\n"
        '  "eventId": "98765432-10ab-cdef-1234-567890abcdef",\n'
        '  "eventType": "ProcessingError",\n'
        '  "timestamp": "2026-11-01T15:00:15.111Z",\n'
        '  "data": {\n'
        '    "imageId": "img_1792624271045_50f91595",\n'
        '    "errorCode": "AI_INFERENCE_TIMEOUT",\n'
        '    "errorMessage": "Tempo limite excedido após 3 tentativas de inferência.",\n'
        '    "retryCount": 3\n'
        "  }\n"
        "}"
    )
    code_table = Table([[Paragraph(events_code.replace("\n", "<br/>").replace(" ", "&nbsp;"), code_style)]], colWidths=[495])
    code_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F4F6F6")),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#BDC3C7")),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(code_table)

    story.append(PageBreak())

    # Section 4: Diagram 1.1
    story.append(Paragraph("4. Diagrama 1.1: Fluxo Normal de Eventos e Requisições", h1_style))
    story.append(Paragraph(
        "O diagrama abaixo representa o <b>caminho feliz (Happy Path)</b> de envio e processamento de imagem, "
        "desde o upload inicial no Frontend SPA até a notificação em tempo real via WebSocket:",
        body_style
    ))
    
    img1_path = "docs/diagrams/fluxo-eventos-normal.png"
    if os.path.exists(img1_path):
        # A4 usable width is ~505 points. Aspect ratio of image: ~700 x 950
        story.append(Image(img1_path, width=495, height=310))
    story.append(Spacer(1, 8))

    story.append(Paragraph("<b>Etapas do Fluxo Normal:</b>", h2_style))
    story.append(Paragraph("• <b>[1. Início do Fluxo]</b>: O cliente envia a requisição HTTP multipart com JWT e Correlation-ID. O API Gateway valida autenticação e limites de tráfego, encaminhando para o <i>image-processing-service</i>.", bullet_style))
    story.append(Paragraph("• <b>[2. Desacoplamento]</b>: O serviço valida extensão e tamanho (10MB), salva o arquivo bruto no Storage, grava metadados no PostgreSQL com Sequelize (status <code>PENDING</code>) e publica <code>ImageUploaded</code> na exchange <code>pixpro.events</code>.", bullet_style))
    story.append(Paragraph("• <b>[3. Resposta Imediata]</b>: A API responde <b>HTTP 202 Accepted</b> em milissegundos para o usuário, liberando a interface gráfica.", bullet_style))
    story.append(Paragraph("• <b>[4. Inferência Assíncrona]</b>: O worker consome da fila <code>image-queue</code>, baixa o binário, executa a inferência de IA e salva o arquivo processado.", bullet_style))
    story.append(Paragraph("• <b>[5. Notificação Push]</b>: O worker publica <code>ImageProcessed</code> e confirma a mensagem (<code>basic.ack</code>). O <i>Notification Service</i> localiza o cliente e envia um push via WebSocket, atualizando a interface sem recarregar a tela.", bullet_style))

    story.append(PageBreak())

    # Section 5: Diagram 1.2
    story.append(Paragraph("5. Diagrama 1.2: Ciclo Completo de Tratamento de Erros e DLQ", h1_style))
    story.append(Paragraph(
        "O diagrama a seguir modela o ciclo de <b>resiliência, retentativas com backoff exponencial, isolamento em Dead Letter Queue (DLQ) "
        "e reconciliação administrativa</b> em cenários de falhas transitórias ou definitivas:",
        body_style
    ))

    img2_path = "docs/diagrams/ciclo-tratamento-erros-dlq.png"
    if os.path.exists(img2_path):
        story.append(Image(img2_path, width=495, height=315))
    story.append(Spacer(1, 8))

    story.append(Paragraph("<b>Pilares do Tratamento de Erros e Tolerância a Falhas:</b>", h2_style))
    story.append(Paragraph("• <b>Backoff Exponencial (Retries 1 e 2)</b>: Em falhas transitórias de I/O ou GPU, a mensagem é direcionada para uma fila temporizada com delay crescente (<i>2s na 1ª tentativa, 4s na 2ª tentativa</i>), evitando sobrecarga em cascata.", bullet_style))
    story.append(Paragraph("• <b>Prevenção de Head-of-Line Blocking</b>: Mensagens corrompidas (<i>poison pills</i>) são retiradas da fila ativa após 3 tentativas via <code>basic.nack(requeue = false)</code>, impedindo o bloqueio do cluster de workers.", bullet_style))
    story.append(Paragraph("• <b>Isolamento em DLQ com Metadados x-death</b>: A mensagem é armazenada com segurança na fila morta <code>image.processing.dlq</code>, mantendo o histórico de tentativas, o erro e o payload original intactos para auditoria.", bullet_style))
    story.append(Paragraph("• <b>Notificação ao Usuário</b>: O evento <code>ProcessingError</code> atualiza a tabela relacional para <code>FAILED</code> e envia alerta visual para o Frontend via WebSocket.", bullet_style))
    story.append(Paragraph("• <b>Reconciliação e Shovel/Replay</b>: Engenheiros de SRE diagnosticam o problema via RabbitMQ Management (porta 15672) e acionam o re-enfileiramento das mensagens mortas de volta para a fila principal sem perda de dados.", bullet_style))

    # Section 6
    story.append(Spacer(1, 6))
    story.append(Paragraph("6. Propostas Técnicas de Evolução Arquitetural", h1_style))
    story.append(Paragraph("1. <b>Transactional Outbox Pattern</b>: Unificar a escrita do registro no PostgreSQL e a publicação do evento em uma transação ACID atômica com tabela de outbox, eliminando inconsistências caso o broker caia no instante do commit.", bullet_style))
    story.append(Paragraph("2. <b>Idempotência Distribuída com Redis</b>: Gravação de chave atômica <code>SETNX image:job:&lt;id&gt; 1 EX 86400</code> para prevenir duplicidade de inferência em casos de reentrega de rede.", bullet_style))
    story.append(Paragraph("3. <b>Autoescalonamento por Fila (KEDA)</b>: Alocação automática de réplicas de workers de IA conforme a métrica de profundidade da fila (<code>queue_length &gt; 10</code>).", bullet_style))

    # Build
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF successfully generated at: {pdf_path}")

if __name__ == '__main__':
    create_pdf()

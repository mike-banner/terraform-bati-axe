"""Mise en page commune des guides PDF BÂTI-AXE (reportlab, police Arial pour les accents)."""
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Table, TableStyle,
                                KeepTogether, PageBreak, Image, Flowable, NextPageTemplate)
from PIL import Image as PILImage

FONTS = 'C:/Windows/Fonts/'
for name, f in (('Arial', 'arial.ttf'), ('Arial-Bold', 'arialbd.ttf'), ('Arial-Italic', 'ariali.ttf'), ('Arial-BoldItalic', 'arialbi.ttf')):
    pdfmetrics.registerFont(TTFont(name, FONTS + f))
pdfmetrics.registerFontFamily('Arial', normal='Arial', bold='Arial-Bold', italic='Arial-Italic', boldItalic='Arial-BoldItalic')

INK = colors.HexColor('#0f172a')
MUTED = colors.HexColor('#475569')
ACCENT = colors.HexColor('#ea580c')
SOFT = colors.HexColor('#f1f5f9')
LINE = colors.HexColor('#cbd5e1')
OK = colors.HexColor('#15803d')
WARN = colors.HexColor('#b45309')
INFO = colors.HexColor('#1d4ed8')

W, H = A4
MARGIN = 20 * mm
CONTENT_W = W - 2 * MARGIN

ST = {
    'body': ParagraphStyle('body', fontName='Arial', fontSize=10.5, leading=15, textColor=INK, alignment=TA_LEFT, spaceAfter=6),
    'small': ParagraphStyle('small', fontName='Arial', fontSize=9, leading=12.5, textColor=MUTED),
    'h1': ParagraphStyle('h1', fontName='Arial-Bold', fontSize=18, leading=22, textColor=INK, spaceBefore=6, spaceAfter=4),
    'h2': ParagraphStyle('h2', fontName='Arial-Bold', fontSize=13, leading=17, textColor=INK, spaceBefore=12, spaceAfter=4),
    'step_t': ParagraphStyle('step_t', fontName='Arial-Bold', fontSize=11.5, leading=15, textColor=INK, spaceAfter=2),
    'step_b': ParagraphStyle('step_b', fontName='Arial', fontSize=10.5, leading=14.5, textColor=INK, spaceAfter=3),
    'bullet': ParagraphStyle('bullet', fontName='Arial', fontSize=10.5, leading=14.5, textColor=INK, leftIndent=14, bulletIndent=3, spaceAfter=2),
    'cell': ParagraphStyle('cell', fontName='Arial', fontSize=9.5, leading=13, textColor=INK),
    'cellb': ParagraphStyle('cellb', fontName='Arial-Bold', fontSize=9.5, leading=13, textColor=INK),
    'cap': ParagraphStyle('cap', fontName='Arial-Italic', fontSize=8.5, leading=11, textColor=MUTED, spaceBefore=3, spaceAfter=8),
    'cover_t': ParagraphStyle('cover_t', fontName='Arial-Bold', fontSize=34, leading=38, textColor=colors.white),
    'cover_s': ParagraphStyle('cover_s', fontName='Arial', fontSize=14, leading=20, textColor=colors.HexColor('#e2e8f0')),
}


def P(text, style='body'):
    return Paragraph(text, ST[style])


def H1(text):
    return KeepTogether([Paragraph(text, ST['h1']), Rule(ACCENT, 1.6, 40 * mm), Spacer(1, 6)])


def H2(text):
    return Paragraph(text, ST['h2'])


def bullets(items):
    return [Paragraph(t, ST['bullet'], bulletText='•') for t in items]


class Rule(Flowable):
    def __init__(self, color=LINE, thickness=0.6, width=None):
        super().__init__()
        self.color, self.thickness, self._w = color, thickness, width

    def wrap(self, aw, ah):
        self.width = self._w or aw
        return self.width, self.thickness + 2

    def draw(self):
        self.canv.setStrokeColor(self.color)
        self.canv.setLineWidth(self.thickness)
        self.canv.line(0, 1, self.width, 1)


class Badge(Flowable):
    """Pastille numérotée."""
    def __init__(self, n, size=20):
        super().__init__()
        self.n, self.size = str(n), size

    def wrap(self, aw, ah):
        return self.size, self.size

    def draw(self):
        c = self.canv
        c.setFillColor(ACCENT)
        c.circle(self.size / 2, self.size / 2, self.size / 2, stroke=0, fill=1)
        c.setFillColor(colors.white)
        c.setFont('Arial-Bold', 10.5 if len(self.n) < 2 else 9)
        c.drawCentredString(self.size / 2, self.size / 2 - 3.7, self.n)


def step(n, title, *body):
    """Étape numérotée : pastille + titre + paragraphes / puces."""
    inner = [Paragraph(title, ST['step_t'])]
    for b in body:
        if isinstance(b, str):
            inner.append(Paragraph(b, ST['step_b']))
        elif isinstance(b, list):
            inner.extend(b)
        else:
            inner.append(b)
    t = Table([[Badge(n), inner]], colWidths=[10 * mm, CONTENT_W - 10 * mm])
    t.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LEFTPADDING', (0, 0), (-1, -1), 0),
                           ('RIGHTPADDING', (0, 0), (-1, -1), 0), ('TOPPADDING', (0, 0), (-1, -1), 0),
                           ('BOTTOMPADDING', (0, 0), (-1, -1), 8)]))
    return t


def callout(kind, text):
    color, label = {'tip': (OK, 'Astuce'), 'warn': (WARN, 'Attention'), 'info': (INFO, 'À savoir')}[kind]
    para = Paragraph(f'<font name="Arial-Bold" color="{color.hexval().replace("0x", "#")}">{label}.</font> {text}', ST['cell'])
    t = Table([[para]], colWidths=[CONTENT_W])
    t.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), SOFT), ('LINEBEFORE', (0, 0), (0, -1), 3, color),
                           ('LEFTPADDING', (0, 0), (-1, -1), 10), ('RIGHTPADDING', (0, 0), (-1, -1), 8),
                           ('TOPPADDING', (0, 0), (-1, -1), 7), ('BOTTOMPADDING', (0, 0), (-1, -1), 7)]))
    return KeepTogether([t, Spacer(1, 8)])


def table(header, rows, widths):
    data = [[Paragraph(h, ST['cellb']) for h in header]] + [[Paragraph(c, ST['cell']) for c in r] for r in rows]
    t = Table(data, colWidths=[w * CONTENT_W for w in widths], repeatRows=1)
    t.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, 0), SOFT), ('LINEBELOW', (0, 0), (-1, 0), 1, ACCENT),
                           ('LINEBELOW', (0, 1), (-1, -1), 0.4, LINE), ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                           ('LEFTPADDING', (0, 0), (-1, -1), 6), ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                           ('TOPPADDING', (0, 0), (-1, -1), 5), ('BOTTOMPADDING', (0, 0), (-1, -1), 5)]))
    return [t, Spacer(1, 8)]


def shot(path, caption, max_w=None, max_h=95 * mm, crop=None):
    """Capture d'écran bordée, légendée ; `crop` = (gauche, haut, droite, bas) en pixels."""
    im = PILImage.open(path).convert('RGB')
    if crop:
        im = im.crop(crop)
        path = path.replace('.png', '-c.png')
        im.save(path)
    w, h = im.size
    max_w = max_w or CONTENT_W
    scale = min(max_w / w, max_h / h)
    img = Image(path, width=w * scale, height=h * scale)
    t = Table([[img]], colWidths=[w * scale + 4])
    t.setStyle(TableStyle([('BOX', (0, 0), (-1, -1), 0.8, LINE), ('LEFTPADDING', (0, 0), (-1, -1), 1), ('RIGHTPADDING', (0, 0), (-1, -1), 1),
                           ('TOPPADDING', (0, 0), (-1, -1), 1), ('BOTTOMPADDING', (0, 0), (-1, -1), 1)]))
    t.hAlign = 'LEFT'
    return KeepTogether([t, Paragraph(caption, ST['cap'])])


def build(path, title, subtitle, audience, story, version='Version 1.0 — 18 novembre 2026'):
    def cover(canv, doc):
        canv.saveState()
        canv.setFillColor(INK)
        canv.rect(0, 0, W, H, stroke=0, fill=1)
        canv.setFillColor(ACCENT)
        canv.rect(0, H - 14 * mm, W, 14 * mm, stroke=0, fill=1)
        canv.setFillColor(colors.white)
        canv.setFont('Arial-Bold', 13)
        canv.drawString(MARGIN, H - 9.2 * mm, 'BÂTI-AXE')
        canv.setFont('Arial', 10)
        canv.setFillColor(colors.HexColor('#94a3b8'))
        canv.drawString(MARGIN, 22 * mm, version)
        canv.drawString(MARGIN, 16.5 * mm, 'Document établi sur la version de test du site (environnement de développement).')
        canv.restoreState()

    def later(canv, doc):
        canv.saveState()
        canv.setStrokeColor(LINE)
        canv.setLineWidth(0.5)
        canv.line(MARGIN, H - 14 * mm, W - MARGIN, H - 14 * mm)
        canv.setFont('Arial-Bold', 8.5)
        canv.setFillColor(ACCENT)
        canv.drawString(MARGIN, H - 11 * mm, 'BÂTI-AXE')
        canv.setFont('Arial', 8.5)
        canv.setFillColor(MUTED)
        canv.drawRightString(W - MARGIN, H - 11 * mm, title)
        canv.line(MARGIN, 14 * mm, W - MARGIN, 14 * mm)
        canv.drawString(MARGIN, 9.5 * mm, version)
        canv.drawRightString(W - MARGIN, 9.5 * mm, f'Page {doc.page - 1}')
        canv.restoreState()

    doc = BaseDocTemplate(path, pagesize=A4, leftMargin=MARGIN, rightMargin=MARGIN, topMargin=22 * mm, bottomMargin=20 * mm,
                          title=title, author='BÂTI-AXE', subject=subtitle)
    f_cover = Frame(MARGIN, 40 * mm, CONTENT_W, H - 120 * mm, id='c', leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
    f_body = Frame(MARGIN, 20 * mm, CONTENT_W, H - 42 * mm, id='b', leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
    doc.addPageTemplates([PageTemplate(id='cover', frames=[f_cover], onPage=cover), PageTemplate(id='body', frames=[f_body], onPage=later)])
    cover_story = [Spacer(1, 40 * mm), Paragraph(title, ST['cover_t']), Spacer(1, 8 * mm), Paragraph(subtitle, ST['cover_s']),
                   Spacer(1, 14 * mm), Paragraph(audience, ParagraphStyle('aud', parent=ST['cover_s'], fontSize=11, textColor=colors.HexColor('#94a3b8'))),
                   NextPageTemplate('body'), PageBreak()]
    doc.build(cover_story + story)

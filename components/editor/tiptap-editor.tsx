"use client"

import { useEditor, EditorContent, BubbleMenu } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import TextAlign from "@tiptap/extension-text-align"
import Underline from "@tiptap/extension-underline"
import TextStyle from "@tiptap/extension-text-style"
import Color from "@tiptap/extension-color"
import FontFamily from "@tiptap/extension-font-family"
import Highlight from "@tiptap/extension-highlight"
import Italic from "@tiptap/extension-italic"
import { Extension } from '@tiptap/core'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import {
    Bold,
    Italic as ItalicIcon,
    Underline as UnderlineIcon,
    AlignLeft,
    AlignCenter,
    AlignRight,
    List,
    ListOrdered,
    Quote,
    Link as LinkIcon,
    ImageIcon,
    Upload,
    Palette,
    Highlighter,
    Minus,
    Plus,
    Undo,
    Redo,
    Code,
    Strikethrough,
    MoreVertical,
    Type,
    Heading1,
    Heading2,
    Heading3,
} from "lucide-react"
import { useState, useCallback } from "react"
import * as React from "react"
import { useToast } from "@/hooks/use-toast"

// Custom Font Size Extension
declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        fontSize: {
            setFontSize: (size: string) => ReturnType
            unsetFontSize: () => ReturnType
        }
    }
}

const FontSize = Extension.create({
    name: 'fontSize',

    addOptions() {
        return {
            types: ['textStyle'],
        }
    },

    addGlobalAttributes() {
        return [
            {
                types: this.options.types,
                attributes: {
                    fontSize: {
                        default: null,
                        parseHTML: element => element.style.fontSize.replace(/['"]+/g, ''),
                        renderHTML: attributes => {
                            if (!attributes.fontSize) {
                                return {}
                            }

                            return {
                                style: `font-size: ${attributes.fontSize}`,
                            }
                        },
                    },
                },
            },
        ]
    },

    addCommands() {
        return {
            setFontSize: fontSize => ({ chain }) => {
                return chain()
                    .setMark('textStyle', { fontSize })
                    .run()
            },
            unsetFontSize: () => ({ chain }) => {
                return chain()
                    .setMark('textStyle', { fontSize: null })
                    .removeEmptyTextStyle()
                    .run()
            },
        }
    },
})

interface TiptapEditorProps {
    content: string
    onChange: (content: string) => void
    documentId: string
}

export default function TiptapEditor({ content, onChange, documentId }: TiptapEditorProps) {
    const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false)
    const [isImageDialogOpen, setIsImageDialogOpen] = useState(false)
    const [linkUrl, setLinkUrl] = useState("")
    const [imageUrl, setImageUrl] = useState("")
    const [isUploading, setIsUploading] = useState(false)
    const { toast } = useToast()

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3, 4, 5, 6],
                },
                bulletList: {
                    keepMarks: true,
                    keepAttributes: false,
                },
                orderedList: {
                    keepMarks: true,
                    keepAttributes: false,
                },
                italic: false, // Disable default italic to use our configured one
            }),
            Italic.configure({
                HTMLAttributes: {
                    class: 'italic',
                    style: 'font-style: italic;',
                },
            }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: "text-blue-600 underline cursor-pointer hover:text-blue-800",
                },
            }),
            Image.configure({
                HTMLAttributes: {
                    class: "mx-auto my-6 max-w-full h-auto rounded-xl shadow-lg border border-gray-200 block transition-all duration-300 hover:shadow-xl hover:scale-[1.02]",
                    style: "max-height: 600px; object-fit: contain;",
                },
                inline: false,
                allowBase64: true,
            }),
            TextAlign.configure({
                types: ["heading", "paragraph", "bulletList", "orderedList"],
                alignments: ["left", "center", "right", "justify"],
                defaultAlignment: "right",
            }),
            Underline,
            TextStyle,
            FontSize,
            Color.configure({
                types: ["textStyle"],
            }),
            FontFamily.configure({
                types: ["textStyle"],
            }),
            Highlight.configure({
                multicolor: true,
            }),
        ],
        content,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML())
        },
        immediatelyRender: false,
        editorProps: {
            attributes: {
                class: "prose prose-lg max-w-none focus:outline-none min-h-[500px] p-6 text-gray-800 [&_img]:mx-auto [&_img]:my-6 [&_img]:block [&_img]:rounded-lg [&_img]:shadow-lg [&_img]:border [&_img]:border-gray-200 [&_img]:max-w-full [&_img]:h-auto [&_img]:cursor-pointer [&_img]:transition-all [&_img]:hover:shadow-xl",
                dir: "auto",
            },
        },
    })

    const handleFileUpload = useCallback(
        async (file: File) => {
            setIsUploading(true)
            try {
                const maxSize = 50 * 1024 * 1024 // 50MB
                if (file.size > maxSize) {
                    toast({
                        title: "فایل بزرگ است",
                        description: "حجم فایل بیش از حد مجاز است (حداکثر 50 مگابایت)",
                        variant: "destructive",
                    })
                    return
                }

                const formData = new FormData()
                formData.append("file", file)

                const response = await fetch(`/api/documents/${documentId}/files`, {
                    method: "POST",
                    body: formData,
                })

                if (response.ok) {
                    const { file: uploadedFile } = await response.json()

                    if (file.type.startsWith("image/")) {
                        editor?.chain().focus(undefined, { scrollIntoView: false }).setImage({
                            src: uploadedFile.url,
                            alt: uploadedFile.filename,
                            title: uploadedFile.filename
                        }).run()
                    } else {
                        const selectedText =
                            editor?.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to) || uploadedFile.filename

                        const fileSize = (uploadedFile.size / 1024 / 1024).toFixed(2)
                        const linkText = selectedText === uploadedFile.filename ?
                            `📎 ${uploadedFile.filename} (${fileSize} MB)` :
                            selectedText

                        editor
                            ?.chain()
                            .focus(undefined, { scrollIntoView: false })
                            .insertContent(`<a href="${uploadedFile.url}" target="_blank" title="${uploadedFile.filename}">${linkText}</a>`)
                            .run()
                    }

                    toast({
                        title: "فایل آپلود شد!",
                        description: `فایل "${uploadedFile.filename}" با موفقیت آپلود شد`,
                    })
                } else {
                    const error = await response.json()
                    toast({
                        title: "خطا در آپلود فایل",
                        description: error.error || "خطای نامشخص در آپلود فایل",
                        variant: "destructive",
                    })
                }
            } catch (error) {
                console.error("File upload error:", error)
                toast({
                    title: "خطا در آپلود فایل",
                    description: "خطا در اتصال به سرور. لطفاً دوباره تلاش کنید.",
                    variant: "destructive",
                })
            } finally {
                setIsUploading(false)
            }
        },
        [editor, documentId, toast],
    )

    const setLink = useCallback(() => {
        if (!editor) return

        if (linkUrl) {
            editor.chain().focus(undefined, { scrollIntoView: false }).extendMarkRange("link").setLink({ href: linkUrl }).run()
        } else {
            editor.chain().focus(undefined, { scrollIntoView: false }).extendMarkRange("link").unsetLink().run()
        }

        setLinkUrl("")
        setIsLinkDialogOpen(false)
    }, [editor, linkUrl])

    const addImage = useCallback(() => {
        if (!editor || !imageUrl) return

        editor.chain().focus(undefined, { scrollIntoView: false }).setImage({ src: imageUrl }).run()
        setImageUrl("")
        setIsImageDialogOpen(false)
    }, [editor, imageUrl])

    const setColor = useCallback(
        (color: string) => {
            editor?.chain().focus(undefined, { scrollIntoView: false }).setColor(color).run()
        },
        [editor],
    )

    const setHighlight = useCallback(
        (color: string) => {
            editor?.chain().focus(undefined, { scrollIntoView: false }).setHighlight({ color }).run()
        },
        [editor],
    )

    // Modified to NOT focus, so the menu stays open
    const setFontFamily = useCallback(
        (fontFamily: string) => {
            editor?.chain().setFontFamily(fontFamily).run()
        },
        [editor],
    )

    if (!editor) {
        return (
            <div className="min-h-[500px] flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">در حال بارگذاری ادیتور...</p>
                </div>
            </div>
        )
    }

    const colors = [
        "#000000", "#374151", "#6B7280", "#EF4444", "#F97316", "#EAB308",
        "#22C55E", "#06B6D4", "#3B82F6", "#8B5CF6", "#EC4899", "#F43F5E",
    ]

    const highlightColors = ["#FEF3C7", "#DBEAFE", "#D1FAE5", "#FEE2E2", "#E0E7FF", "#F3E8FF"]

    const fontFamilies = [
        { label: "پیش‌فرض", value: "inherit" },
        { label: "Arial", value: "Arial, sans-serif" },
        { label: "Times New Roman", value: "Times New Roman, serif" },
        { label: "Courier New", value: "Courier New, monospace" },
        { label: "Georgia", value: "Georgia, serif" },
        { label: "Verdana", value: "Verdana, sans-serif" },
        { label: "Tahoma", value: "Tahoma, sans-serif" },
        { label: "Vazirmatn", value: "var(--font-vazirmatn), sans-serif" },
    ]

    const currentFontSize = editor.getAttributes('textStyle').fontSize?.replace('px', '') || '16'

    return (
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
            {/* Bubble Menu for Selected Text */}
            {editor && (
                <BubbleMenu
                    editor={editor}
                    tippyOptions={{
                        duration: 100,
                        placement: 'top',
                        arrow: true,
                        theme: 'light-border',
                        interactive: true,
                        maxWidth: 600,
                    }}
                    shouldShow={({ editor }) => {
                        // Show if selection is not empty, even if editor loses focus (e.g. to menu buttons)
                        return !editor.state.selection.empty && editor.isEditable
                    }}
                    className="bg-white border border-gray-200 rounded-lg shadow-lg p-2 flex items-center gap-1 flex-wrap max-w-[90vw] md:max-w-[600px]"
                >
                    {/* Basic Formatting */}
                    <Button
                        variant={editor.isActive("bold") ? "default" : "ghost"}
                        size="sm"
                        onClick={() => editor.chain().focus(undefined, { scrollIntoView: false }).toggleBold().run()}
                        title="ضخیم"
                        className="h-8 w-8 p-0"
                    >
                        <Bold className={`w-4 h-4 ${editor.isActive("bold") ? "text-white" : ""}`} />
                    </Button>

                    <Button
                        variant={editor.isActive("italic") ? "default" : "ghost"}
                        size="sm"
                        onClick={() => editor.chain().focus(undefined, { scrollIntoView: false }).toggleItalic().run()}
                        title="کج"
                        className="h-8 w-8 p-0"
                    >
                        <ItalicIcon className={`w-4 h-4 ${editor.isActive("italic") ? "text-white" : ""}`} />
                    </Button>

                    <Button
                        variant={editor.isActive("underline") ? "default" : "ghost"}
                        size="sm"
                        onClick={() => editor.chain().focus(undefined, { scrollIntoView: false }).toggleUnderline().run()}
                        title="زیرخط"
                        className="h-8 w-8 p-0"
                    >
                        <UnderlineIcon className={`w-4 h-4 ${editor.isActive("underline") ? "text-white" : ""}`} />
                    </Button>

                    {/* Colors */}
                    <Popover modal={false}>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" title="رنگ متن" className="h-8 w-8 p-0">
                                <Palette className="w-4 h-4" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-2" side="top" align="center">
                            <div className="grid grid-cols-6 gap-1">
                                {colors.slice(0, 12).map((color) => (
                                    <button
                                        key={color}
                                        className="w-6 h-6 rounded border border-gray-200 hover:border-gray-400 transition-colors"
                                        style={{ backgroundColor: color }}
                                        onClick={() => setColor(color)}
                                        title={color}
                                    />
                                ))}
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => editor.chain().focus(undefined, { scrollIntoView: false }).unsetColor().run()}
                                className="w-full mt-2 text-xs"
                            >
                                حذف رنگ
                            </Button>
                        </PopoverContent>
                    </Popover>

                    <Popover modal={false}>
                        <PopoverTrigger asChild>
                            <Button variant={editor.isActive("highlight") ? "default" : "ghost"} size="sm" title="هایلایت" className="h-8 w-8 p-0">
                                <Highlighter className={`w-4 h-4 ${editor.isActive("highlight") ? "text-white" : ""}`} />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-2" side="top" align="center">
                            <div className="grid grid-cols-6 gap-1">
                                {highlightColors.map((color) => (
                                    <button
                                        key={color}
                                        className="w-6 h-6 rounded border border-gray-200 hover:border-gray-400 transition-colors"
                                        style={{ backgroundColor: color }}
                                        onClick={() => setHighlight(color)}
                                        title={color}
                                    />
                                ))}
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => editor.chain().focus(undefined, { scrollIntoView: false }).unsetHighlight().run()}
                                className="w-full mt-2 text-xs"
                            >
                                حذف هایلایت
                            </Button>
                        </PopoverContent>
                    </Popover>

                    <div className="w-px h-6 bg-gray-300 mx-1" />

                    {/* Alignment (Moved back to main menu) */}
                    <Button
                        variant={editor.isActive({ textAlign: "right" }) ? "default" : "ghost"}
                        size="sm"
                        onClick={() => editor.chain().focus(undefined, { scrollIntoView: false }).setTextAlign("right").run()}
                        title="راست‌چین"
                        className="h-8 w-8 p-0"
                    >
                        <AlignRight className={`w-4 h-4 ${editor.isActive({ textAlign: "right" }) ? "text-white" : ""}`} />
                    </Button>

                    <Button
                        variant={editor.isActive({ textAlign: "center" }) ? "default" : "ghost"}
                        size="sm"
                        onClick={() => editor.chain().focus(undefined, { scrollIntoView: false }).setTextAlign("center").run()}
                        title="وسط‌چین"
                        className="h-8 w-8 p-0"
                    >
                        <AlignCenter className={`w-4 h-4 ${editor.isActive({ textAlign: "center" }) ? "text-white" : ""}`} />
                    </Button>

                    <Button
                        variant={editor.isActive({ textAlign: "left" }) ? "default" : "ghost"}
                        size="sm"
                        onClick={() => editor.chain().focus(undefined, { scrollIntoView: false }).setTextAlign("left").run()}
                        title="چپ‌چین"
                        className="h-8 w-8 p-0"
                    >
                        <AlignLeft className={`w-4 h-4 ${editor.isActive({ textAlign: "left" }) ? "text-white" : ""}`} />
                    </Button>

                    <div className="w-px h-6 bg-gray-300 mx-1" />

                    {/* More Options Popover */}
                    <Popover modal={false}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                title="بیشتر"
                                className="h-8 w-8 p-0"
                            >
                                <MoreVertical className="w-4 h-4" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-2 flex flex-col gap-2 max-w-[300px]" side="bottom" align="center">

                            {/* Row 1: Font Size & Lists */}
                            <div className="flex items-center gap-1 justify-between">
                                <div className="flex items-center gap-1 bg-gray-50 rounded-md p-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            const current = parseInt(editor.getAttributes('textStyle').fontSize?.replace('px', '') || '16')
                                            // REMOVED focus() to keep menu open
                                            editor.chain().setFontSize(`${Math.max(8, current - 2)}px`).run()
                                        }}
                                        title="کاهش اندازه فونت"
                                        className="h-6 w-6 p-0"
                                    >
                                        <Minus className="w-3 h-3" />
                                    </Button>
                                    <span className="text-xs w-6 text-center">{currentFontSize}</span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            const current = parseInt(editor.getAttributes('textStyle').fontSize?.replace('px', '') || '16')
                                            // REMOVED focus() to keep menu open
                                            editor.chain().setFontSize(`${Math.min(72, current + 2)}px`).run()
                                        }}
                                        title="افزایش اندازه فونت"
                                        className="h-6 w-6 p-0"
                                    >
                                        <Plus className="w-3 h-3" />
                                    </Button>
                                </div>

                                <div className="flex items-center gap-1">
                                    <Button
                                        variant={editor.isActive("bulletList") ? "default" : "ghost"}
                                        size="sm"
                                        onClick={() => editor.chain().toggleBulletList().run()} // REMOVED focus()
                                        title="لیست نقطه‌ای"
                                        className="h-8 w-8 p-0"
                                    >
                                        <List className={`w-4 h-4 ${editor.isActive("bulletList") ? "text-white" : ""}`} />
                                    </Button>

                                    <Button
                                        variant={editor.isActive("orderedList") ? "default" : "ghost"}
                                        size="sm"
                                        onClick={() => editor.chain().toggleOrderedList().run()} // REMOVED focus()
                                        title="لیست شماره‌دار"
                                        className="h-8 w-8 p-0"
                                    >
                                        <ListOrdered className={`w-4 h-4 ${editor.isActive("orderedList") ? "text-white" : ""}`} />
                                    </Button>

                                    <Button
                                        variant={editor.isActive("blockquote") ? "default" : "ghost"}
                                        size="sm"
                                        onClick={() => editor.chain().toggleBlockquote().run()} // REMOVED focus()
                                        title="نقل قول"
                                        className="h-8 w-8 p-0"
                                    >
                                        <Quote className={`w-4 h-4 ${editor.isActive("blockquote") ? "text-white" : ""}`} />
                                    </Button>
                                </div>
                            </div>

                            <Separator />

                            {/* Row 2: Headings (Buttons instead of Select) */}
                            <div className="flex items-center gap-1 justify-center">
                                <Button
                                    variant={editor.isActive('paragraph') ? "default" : "ghost"}
                                    size="sm"
                                    onClick={() => editor.chain().setParagraph().run()} // REMOVED focus()
                                    title="متن ساده"
                                    className="h-8 w-8 p-0"
                                >
                                    <Type className={`w-4 h-4 ${editor.isActive('paragraph') ? "text-white" : ""}`} />
                                </Button>
                                <Button
                                    variant={editor.isActive('heading', { level: 1 }) ? "default" : "ghost"}
                                    size="sm"
                                    onClick={() => editor.chain().toggleHeading({ level: 1 }).run()} // REMOVED focus()
                                    title="تیتر 1"
                                    className="h-8 w-8 p-0"
                                >
                                    <Heading1 className={`w-4 h-4 ${editor.isActive('heading', { level: 1 }) ? "text-white" : ""}`} />
                                </Button>
                                <Button
                                    variant={editor.isActive('heading', { level: 2 }) ? "default" : "ghost"}
                                    size="sm"
                                    onClick={() => editor.chain().toggleHeading({ level: 2 }).run()} // REMOVED focus()
                                    title="تیتر 2"
                                    className="h-8 w-8 p-0"
                                >
                                    <Heading2 className={`w-4 h-4 ${editor.isActive('heading', { level: 2 }) ? "text-white" : ""}`} />
                                </Button>
                                <Button
                                    variant={editor.isActive('heading', { level: 3 }) ? "default" : "ghost"}
                                    size="sm"
                                    onClick={() => editor.chain().toggleHeading({ level: 3 }).run()} // REMOVED focus()
                                    title="تیتر 3"
                                    className="h-8 w-8 p-0"
                                >
                                    <Heading3 className={`w-4 h-4 ${editor.isActive('heading', { level: 3 }) ? "text-white" : ""}`} />
                                </Button>
                            </div>

                            <Separator />

                            {/* Row 3: Font Family (Popover List instead of Select) */}
                            <Popover modal={false}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm" className="w-full justify-between text-xs h-8">
                                        <span className="truncate">
                                            {fontFamilies.find(f => editor.isActive('textStyle', { fontFamily: f.value }))?.label || "فونت"}
                                        </span>
                                        <MoreVertical className="w-3 h-3 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-40 p-1" side="right" align="start">
                                    <div className="flex flex-col gap-0.5 max-h-[200px] overflow-y-auto">
                                        {fontFamilies.map((font) => (
                                            <Button
                                                key={font.value}
                                                variant="ghost"
                                                size="sm"
                                                className="justify-start text-xs h-7"
                                                style={{ fontFamily: font.value }}
                                                onClick={() => setFontFamily(font.value)}
                                            >
                                                {font.label}
                                            </Button>
                                        ))}
                                    </div>
                                </PopoverContent>
                            </Popover>

                            <Separator />

                            {/* Row 4: Extra Actions */}
                            <div className="flex items-center gap-1 justify-center">
                                <Button
                                    variant={editor.isActive("link") ? "default" : "ghost"}
                                    size="sm"
                                    onClick={() => {
                                        const url = window.prompt('آدرس لینک را وارد کنید:')
                                        if (url) {
                                            editor.chain().setLink({ href: url }).run() // REMOVED focus()
                                        }
                                    }}
                                    title="لینک"
                                    className="h-8 w-8 p-0"
                                >
                                    <LinkIcon className={`w-4 h-4 ${editor.isActive("link") ? "text-white" : ""}`} />
                                </Button>

                                <Button
                                    variant={editor.isActive("strike") ? "default" : "ghost"}
                                    size="sm"
                                    onClick={() => editor.chain().toggleStrike().run()} // REMOVED focus()
                                    title="خط خورده"
                                    className="h-8 w-8 p-0"
                                >
                                    <Strikethrough className={`w-4 h-4 ${editor.isActive("strike") ? "text-white" : ""}`} />
                                </Button>

                                <Button
                                    variant={editor.isActive("code") ? "default" : "ghost"}
                                    size="sm"
                                    onClick={() => editor.chain().toggleCode().run()} // REMOVED focus()
                                    title="کد"
                                    className="h-8 w-8 p-0"
                                >
                                    <Code className={`w-4 h-4 ${editor.isActive("code") ? "text-white" : ""}`} />
                                </Button>
                            </div>
                        </PopoverContent>
                    </Popover>
                </BubbleMenu>
            )}

            {/* Toolbar */}
            <div className="border-b border-gray-200 p-4 bg-gray-50 sticky top-0 z-10 md:static">
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Undo/Redo */}
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => editor.chain().focus(undefined, { scrollIntoView: false }).undo().run()}
                            disabled={!editor.can().undo()}
                            title="بازگردانی"
                        >
                            <Undo className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => editor.chain().focus(undefined, { scrollIntoView: false }).redo().run()}
                            disabled={!editor.can().redo()}
                            title="تکرار"
                        >
                            <Redo className="w-4 h-4" />
                        </Button>
                    </div>

                    <Separator orientation="vertical" className="h-6" />

                    {/* Heading Level */}
                    <Select
                        value={
                            editor.isActive('heading', { level: 1 }) ? 'h1' :
                                editor.isActive('heading', { level: 2 }) ? 'h2' :
                                    editor.isActive('heading', { level: 3 }) ? 'h3' :
                                        editor.isActive('heading', { level: 4 }) ? 'h4' :
                                            editor.isActive('heading', { level: 5 }) ? 'h5' :
                                                editor.isActive('heading', { level: 6 }) ? 'h6' :
                                                    'p'
                        }
                        onValueChange={(value) => {
                            if (value === 'p') {
                                editor.chain().focus(undefined, { scrollIntoView: false }).setParagraph().run()
                            } else {
                                const level = parseInt(value.replace('h', ''))
                                editor.chain().focus(undefined, { scrollIntoView: false }).toggleHeading({ level: level as 1 | 2 | 3 | 4 | 5 | 6 }).run()
                            }
                        }}
                    >
                        <SelectTrigger className="w-24 h-8">
                            <SelectValue placeholder="سطح" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="p">متن</SelectItem>
                            <SelectItem value="h1">H1</SelectItem>
                            <SelectItem value="h2">H2</SelectItem>
                            <SelectItem value="h3">H3</SelectItem>
                            <SelectItem value="h4">H4</SelectItem>
                            <SelectItem value="h5">H5</SelectItem>
                            <SelectItem value="h6">H6</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Font Family */}
                    <Select value="" onValueChange={setFontFamily}>
                        <SelectTrigger className="w-32 h-8">
                            <SelectValue placeholder="فونت" />
                        </SelectTrigger>
                        <SelectContent>
                            {fontFamilies.map((font) => (
                                <SelectItem key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                                    {font.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Font Size */}
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                const current = parseInt(editor.getAttributes('textStyle').fontSize?.replace('px', '') || '16')
                                editor.chain().focus(undefined, { scrollIntoView: false }).setFontSize(`${Math.max(8, current - 2)}px`).run()
                            }}
                            title="کاهش اندازه فونت"
                        >
                            <Minus className="w-3 h-3" />
                        </Button>
                        <Input
                            type="number"
                            value={currentFontSize}
                            onChange={(e) => {
                                const val = e.target.value
                                editor.chain().focus(undefined, { scrollIntoView: false }).setFontSize(`${val}px`).run()
                            }}
                            className="w-16 h-8 text-center"
                            min="8"
                            max="72"
                        />
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                const current = parseInt(editor.getAttributes('textStyle').fontSize?.replace('px', '') || '16')
                                editor.chain().focus(undefined, { scrollIntoView: false }).setFontSize(`${Math.min(72, current + 2)}px`).run()
                            }}
                            title="افزایش اندازه فونت"
                        >
                            <Plus className="w-3 h-3" />
                        </Button>
                    </div>

                    <Separator orientation="vertical" className="h-6" />

                    {/* Text Formatting */}
                    <div className="flex items-center gap-1">
                        <Button
                            variant={editor.isActive("bold") ? "default" : "ghost"}
                            size="sm"
                            onClick={() => editor.chain().focus(undefined, { scrollIntoView: false }).toggleBold().run()}
                            title="ضخیم"
                        >
                            <Bold className={`w-4 h-4 ${editor.isActive("bold") ? "text-white" : ""}`} />
                        </Button>

                        <Button
                            variant={editor.isActive("italic") ? "default" : "ghost"}
                            size="sm"
                            onClick={() => editor.chain().focus(undefined, { scrollIntoView: false }).toggleItalic().run()}
                            title="کج"
                        >
                            <ItalicIcon className={`w-4 h-4 ${editor.isActive("italic") ? "text-white" : ""}`} />
                        </Button>

                        <Button
                            variant={editor.isActive("underline") ? "default" : "ghost"}
                            size="sm"
                            onClick={() => editor.chain().focus(undefined, { scrollIntoView: false }).toggleUnderline().run()}
                            title="زیرخط"
                        >
                            <UnderlineIcon className={`w-4 h-4 ${editor.isActive("underline") ? "text-white" : ""}`} />
                        </Button>

                        <Button
                            variant={editor.isActive("strike") ? "default" : "ghost"}
                            size="sm"
                            onClick={() => editor.chain().focus(undefined, { scrollIntoView: false }).toggleStrike().run()}
                            title="خط خورده"
                        >
                            <Strikethrough className={`w-4 h-4 ${editor.isActive("strike") ? "text-white" : ""}`} />
                        </Button>

                        <Button
                            variant={editor.isActive("code") ? "default" : "ghost"}
                            size="sm"
                            onClick={() => editor.chain().focus(undefined, { scrollIntoView: false }).toggleCode().run()}
                            title="کد"
                        >
                            <Code className={`w-4 h-4 ${editor.isActive("code") ? "text-white" : ""}`} />
                        </Button>
                    </div>

                    <Separator orientation="vertical" className="h-6" />

                    {/* Text Color */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" title="رنگ متن">
                                <Palette className="w-4 h-4" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-3">
                            <div className="space-y-3">
                                <h4 className="font-medium text-sm">رنگ متن</h4>
                                <div className="grid grid-cols-6 gap-2">
                                    {colors.map((color) => (
                                        <button
                                            key={color}
                                            className="w-8 h-8 rounded border-2 border-gray-200 hover:border-gray-400 transition-colors"
                                            style={{ backgroundColor: color }}
                                            onClick={() => setColor(color)}
                                            title={color}
                                        />
                                    ))}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => editor.chain().focus(undefined, { scrollIntoView: false }).unsetColor().run()}
                                    className="w-full"
                                >
                                    حذف رنگ
                                </Button>
                            </div>
                        </PopoverContent>
                    </Popover>

                    {/* Highlight */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant={editor.isActive("highlight") ? "default" : "ghost"} size="sm" title="هایلایت">
                                <Highlighter className={`w-4 h-4 ${editor.isActive("highlight") ? "text-white" : ""}`} />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-3">
                            <div className="space-y-3">
                                <h4 className="font-medium text-sm">رنگ هایلایت</h4>
                                <div className="grid grid-cols-3 gap-2">
                                    {highlightColors.map((color) => (
                                        <button
                                            key={color}
                                            className="w-12 h-8 rounded border-2 border-gray-200 hover:border-gray-400 transition-colors"
                                            style={{ backgroundColor: color }}
                                            onClick={() => setHighlight(color)}
                                            title={color}
                                        />
                                    ))}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => editor.chain().focus(undefined, { scrollIntoView: false }).unsetHighlight().run()}
                                    className="w-full"
                                >
                                    حذف هایلایت
                                </Button>
                            </div>
                        </PopoverContent>
                    </Popover>

                    <Separator orientation="vertical" className="h-6" />

                    {/* Text Alignment */}
                    <div className="flex items-center gap-1">
                        <Button
                            variant={editor.isActive({ textAlign: "right" }) ? "default" : "ghost"}
                            size="sm"
                            onClick={() => editor.chain().focus(undefined, { scrollIntoView: false }).setTextAlign("right").run()}
                            title="راست‌چین"
                        >
                            <AlignRight className={`w-4 h-4 ${editor.isActive({ textAlign: "right" }) ? "text-white" : ""}`} />
                        </Button>

                        <Button
                            variant={editor.isActive({ textAlign: "center" }) ? "default" : "ghost"}
                            size="sm"
                            onClick={() => editor.chain().focus(undefined, { scrollIntoView: false }).setTextAlign("center").run()}
                            title="وسط‌چین"
                        >
                            <AlignCenter className={`w-4 h-4 ${editor.isActive({ textAlign: "center" }) ? "text-white" : ""}`} />
                        </Button>

                        <Button
                            variant={editor.isActive({ textAlign: "left" }) ? "default" : "ghost"}
                            size="sm"
                            onClick={() => editor.chain().focus(undefined, { scrollIntoView: false }).setTextAlign("left").run()}
                            title="چپ‌چین"
                        >
                            <AlignLeft className={`w-4 h-4 ${editor.isActive({ textAlign: "left" }) ? "text-white" : ""}`} />
                        </Button>
                    </div>

                    <Separator orientation="vertical" className="h-6" />

                    {/* Lists and Quote */}
                    <div className="flex items-center gap-1">
                        <Button
                            variant={editor.isActive("bulletList") ? "default" : "ghost"}
                            size="sm"
                            onClick={() => editor.chain().focus(undefined, { scrollIntoView: false }).toggleBulletList().run()}
                            title="لیست نقطه‌ای"
                        >
                            <List className={`w-4 h-4 ${editor.isActive("bulletList") ? "text-white" : ""}`} />
                        </Button>

                        <Button
                            variant={editor.isActive("orderedList") ? "default" : "ghost"}
                            size="sm"
                            onClick={() => editor.chain().focus(undefined, { scrollIntoView: false }).toggleOrderedList().run()}
                            title="لیست شماره‌دار"
                        >
                            <ListOrdered className={`w-4 h-4 ${editor.isActive("orderedList") ? "text-white" : ""}`} />
                        </Button>

                        <Button
                            variant={editor.isActive("blockquote") ? "default" : "ghost"}
                            size="sm"
                            onClick={() => editor.chain().focus(undefined, { scrollIntoView: false }).toggleBlockquote().run()}
                            title="نقل قول"
                        >
                            <Quote className={`w-4 h-4 ${editor.isActive("blockquote") ? "text-white" : ""}`} />
                        </Button>
                    </div>

                    <Separator orientation="vertical" className="h-6" />

                    {/* Link */}
                    <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant={editor.isActive("link") ? "default" : "ghost"} size="sm" title="لینک">
                                <LinkIcon className={`w-4 h-4 ${editor.isActive("link") ? "text-white" : ""}`} />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md" dir="rtl">
                            <DialogHeader>
                                <DialogTitle>افزودن لینک</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="link-url">آدرس لینک</Label>
                                    <Input
                                        id="link-url"
                                        value={linkUrl}
                                        onChange={(e) => setLinkUrl(e.target.value)}
                                        placeholder="https://example.com"
                                        dir="ltr"
                                    />
                                </div>
                                <div className="flex justify-end space-x-2 space-x-reverse">
                                    <Button variant="outline" onClick={() => setIsLinkDialogOpen(false)}>
                                        انصراف
                                    </Button>
                                    <Button onClick={setLink}>افزودن لینک</Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>

                    {/* Image */}
                    <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" title="تصویر">
                                <ImageIcon className="w-4 h-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md" dir="rtl">
                            <DialogHeader>
                                <DialogTitle>افزودن تصویر</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="image-url">آدرس تصویر</Label>
                                    <Input
                                        id="image-url"
                                        value={imageUrl}
                                        onChange={(e) => setImageUrl(e.target.value)}
                                        placeholder="https://example.com/image.jpg"
                                        dir="ltr"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="image-file">یا فایل تصویر را انتخاب کنید</Label>
                                    <Input
                                        id="image-file"
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0]
                                            if (file) {
                                                handleFileUpload(file)
                                                setIsImageDialogOpen(false)
                                            }
                                        }}
                                        disabled={isUploading}
                                    />
                                </div>
                                <div className="flex justify-end space-x-2 space-x-reverse">
                                    <Button variant="outline" onClick={() => setIsImageDialogOpen(false)}>
                                        انصراف
                                    </Button>
                                    <Button onClick={addImage} disabled={!imageUrl}>
                                        افزودن تصویر
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>

                    {/* File Upload */}
                    <div className="relative">
                        <input
                            type="file"
                            id="file-upload"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) {
                                    handleFileUpload(file)
                                }
                            }}
                            disabled={isUploading}
                        />
                        <Button variant="ghost" size="sm" title="آپلود فایل" disabled={isUploading}>
                            <Upload className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Editor Content */}
            <div
                className="relative h-[calc(100vh-180px)] md:h-auto overflow-auto md:overflow-visible w-full"
                style={{
                    overscrollBehavior: 'contain',
                    WebkitOverflowScrolling: 'touch'
                }}
            >
                <EditorContent editor={editor} />
                {isUploading && (
                    <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                            <p className="text-sm text-gray-600">در حال آپلود فایل...</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
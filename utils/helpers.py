import sys

def print_line(left_text, right_text):
    """
    Renders a line centered within terminal visual bounds.
    """
    spaces_count = 74 - len(left_text) - len(right_text)
    if spaces_count < 0:
        spaces_count = 1
    print("│  " + left_text + " " * spaces_count + right_text + "  │")

def print_empty():
    """Renders an empty spacing row within the terminal container bounds."""
    print("│" + " " * 78 + "│")

def format_terminal_box_header(title):
    """Prints a nice terminal section header."""
    title_len = len(title)
    dash_len = (76 - title_len) // 2
    left_dashes = "─" * dash_len
    right_dashes = "─" * (76 - title_len - dash_len)
    print(f"┌{left_dashes} {title} {right_dashes}┐")

def format_terminal_box_footer():
    """Prints a closing box footer."""
    print("└" + "─" * 78 + "┘")

def flush_stdout():
    """Ensures any outputs are flushed to stdout immediately."""
    sys.stdout.flush()

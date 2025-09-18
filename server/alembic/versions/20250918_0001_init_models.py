"""
initial tables and columns for integrations and task fields

Revision ID: 20250918_0001
Revises: 
Create Date: 2025-09-18
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20250918_0001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create integration setting table if not exists
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if not inspector.has_table('integrationsetting'):
        op.create_table(
            'integrationsetting',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('provider', sa.String(length=50), nullable=False),
            sa.Column('token', sa.Text(), nullable=False),
            sa.Column('base_url', sa.String(length=255), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=False),
        )
        op.create_index('ix_integrationsetting_id', 'integrationsetting', ['id'], unique=False)
        op.create_index('ix_integrationsetting_user_id', 'integrationsetting', ['user_id'], unique=False)
        # Add FKs using naming convention
        op.create_foreign_key('fk_integrationsetting_user_id_user', 'integrationsetting', 'user', ['user_id'], ['id'], ondelete='CASCADE')

    # Add columns to task if not exist
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_cols = {c['name'] for c in inspector.get_columns('task')}
    existing_indexes = {i['name'] for i in inspector.get_indexes('task')}

    with op.batch_alter_table('task') as batch_op:
        # remind_at
        if 'remind_at' not in existing_cols:
            batch_op.add_column(sa.Column('remind_at', sa.DateTime(), nullable=True))
        if 'ix_task_remind_at' not in existing_indexes:
            # create index only if not exists
            batch_op.create_index('ix_task_remind_at', ['remind_at'], unique=False)
        # blinko_note_id
        if 'blinko_note_id' not in existing_cols:
            batch_op.add_column(sa.Column('blinko_note_id', sa.String(length=64), nullable=True))
        if 'ix_task_blinko_note_id' not in existing_indexes:
            batch_op.create_index('ix_task_blinko_note_id', ['blinko_note_id'], unique=False)


def downgrade() -> None:
    with op.batch_alter_table('task') as batch_op:
        try:
            batch_op.drop_index('ix_task_blinko_note_id')
            batch_op.drop_column('blinko_note_id')
        except Exception:
            pass
        try:
            batch_op.drop_index('ix_task_remind_at')
            batch_op.drop_column('remind_at')
        except Exception:
            pass

    try:
        op.drop_constraint('fk_integrationsetting_user_id_user', 'integrationsetting', type_='foreignkey')
    except Exception:
        pass
    op.drop_index('ix_integrationsetting_user_id', table_name='integrationsetting')
    op.drop_index('ix_integrationsetting_id', table_name='integrationsetting')
    op.drop_table('integrationsetting')

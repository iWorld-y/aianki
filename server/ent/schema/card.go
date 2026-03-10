package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
)

type Card struct {
	ent.Schema
}

func (Card) Fields() []ent.Field {
	return []ent.Field{
		field.Int("user_id"),
		field.Int("deck_id"),
		field.String("front").
			NotEmpty(),
		field.String("back").
			NotEmpty(),
		field.Strings("tags").
			Optional(),
		field.String("source_image_url").
			Optional().
			Nillable(),
		field.Float("stability").
			Default(0),
		field.Float("difficulty").
			Default(0),
		field.Time("due_date").
			Default(time.Now),
		field.Int("reps").
			Default(0),
		field.Int("lapses").
			Default(0),
		field.Enum("state").
			Values("new", "learning", "review", "relearning").
			Default("new"),
		field.Time("created_at").
			Default(time.Now),
		field.Time("updated_at").
			Default(time.Now).
			UpdateDefault(time.Now),
	}
}

func (Card) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("user", User.Type).
			Ref("cards").
			Unique().
			Required().
			Field("user_id"),
		edge.From("deck", Deck.Type).
			Ref("cards").
			Unique().
			Required().
			Field("deck_id"),
		edge.To("review_logs", ReviewLog.Type),
	}
}
